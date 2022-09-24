// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "../interfaces/IFlashLoanReceiver.sol";
import "../interfaces/IBNFT.sol";
import "../interfaces/IBNFTRegistry.sol";

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";

/**
 * @title Airdrop receiver contract and implement IFlashLoanReceiver interface
 * @author BendDAO
 * @dev implement a flashloan-compatible flashLoanReceiver contract
 **/
contract AirdropFlashLoanReceiverV3 is
  IFlashLoanReceiver,
  ReentrancyGuardUpgradeable,
  OwnableUpgradeable,
  ERC721HolderUpgradeable,
  ERC1155HolderUpgradeable
{
  address public bnftRegistry;
  mapping(bytes32 => bool) public airdropClaimRecords;
  uint256 public deployType;
  uint256 public constant VERSION = 3;

  // ERC20: token address => partner address => token amount
  mapping(address => mapping(address => uint256)) public borrowedERC20FromPartners;
  // ERC20: token address => total amount
  mapping(address => uint256) public totalBorrowedERC20FromPartners;

  // ERC721: token address => token id => partner address
  mapping(address => mapping(uint256 => address)) public borrowedERC721FromPartners;

  // ERC1155: token address => token id => partner address => token amount
  mapping(address => mapping(uint256 => mapping(address => uint256))) public borrowedERC1155FromPartners;
  // ERC1155: token address => token id => total amount
  mapping(address => mapping(uint256 => uint256)) public totalBorrowedERC1155FromPartners;

  function initialize(
    address owner_,
    address bnftRegistry_,
    uint256 deployType_
  ) public initializer {
    __ReentrancyGuard_init();
    __Ownable_init();
    __ERC721Holder_init();
    __ERC1155Holder_init();

    require(owner_ != address(0), "zero owner address");
    require(bnftRegistry_ != address(0), "zero registry address");

    bnftRegistry = bnftRegistry_;
    deployType = deployType_;

    _transferOwnership(owner_);
  }

  struct ExecuteOperationLocalVars {
    uint256[] airdropTokenTypes;
    address[] airdropTokenAddresses;
    uint256[] airdropTokenIds;
    address airdropContract;
    bytes airdropParams;
    uint256 airdropBalance;
    uint256 airdropTokenId;
    bytes32 airdropKeyHash;
    uint256 ethValue;
  }

  /**
   * @dev Implement the flash loan receiver interface of boundNFT
   * @param nftAsset address of original NFT contract
   * @param nftTokenIds id list of original NFT token
   * @param initiator address of original msg sender (caller)
   * @param operator address of bound NFT contract
   * @param params parameters to call third party contract
   */
  function executeOperation(
    address nftAsset,
    uint256[] calldata nftTokenIds,
    address initiator,
    address operator,
    bytes calldata params
  ) external override returns (bool) {
    ExecuteOperationLocalVars memory vars;

    // check caller and owner
    (address bnftProxy, ) = IBNFTRegistry(bnftRegistry).getBNFTAddresses(nftAsset);
    require(bnftProxy == msg.sender, "caller not bnft");

    // 0 = used for public, created by BendDAO, 1 - used for private, created by owner
    if (deployType != 0) {
      require(initiator == owner(), "initiator not owner");
    }

    require(nftTokenIds.length > 0, "empty token list");

    // decode parameters
    (
      vars.airdropTokenTypes,
      vars.airdropTokenAddresses,
      vars.airdropTokenIds,
      vars.airdropContract,
      vars.airdropParams,
      vars.ethValue
    ) = abi.decode(params, (uint256[], address[], uint256[], address, bytes, uint256));

    // airdrop token list can be empty, no need transfer immediately after call method
    // require(vars.airdropTokenTypes.length > 0, "invalid airdrop token type");
    require(vars.airdropTokenAddresses.length == vars.airdropTokenTypes.length, "invalid airdrop token address length");
    require(vars.airdropTokenIds.length == vars.airdropTokenTypes.length, "invalid airdrop token id length");

    require(vars.airdropContract != address(0), "invalid airdrop contract address");
    require(vars.airdropParams.length >= 4, "invalid airdrop parameters");

    // allow operator transfer borrowed nfts back to bnft
    IERC721Upgradeable(nftAsset).setApprovalForAll(operator, true);

    // call project aidrop contract
    AddressUpgradeable.functionCallWithValue(
      vars.airdropContract,
      vars.airdropParams,
      vars.ethValue,
      "call airdrop method failed"
    );

    vars.airdropKeyHash = getClaimKeyHash(initiator, nftAsset, nftTokenIds, params);
    airdropClaimRecords[vars.airdropKeyHash] = true;

    // transfer airdrop tokens to borrower
    for (uint256 typeIndex = 0; typeIndex < vars.airdropTokenTypes.length; typeIndex++) {
      require(vars.airdropTokenAddresses[typeIndex] != address(0), "invalid airdrop token address");

      if (vars.airdropTokenTypes[typeIndex] == 1) {
        // ERC20
        vars.airdropBalance = IERC20Upgradeable(vars.airdropTokenAddresses[typeIndex]).balanceOf(address(this));
        if (vars.airdropBalance > 0) {
          IERC20Upgradeable(vars.airdropTokenAddresses[typeIndex]).transfer(initiator, vars.airdropBalance);
        }
      } else if (vars.airdropTokenTypes[typeIndex] == 2) {
        // ERC721 with Enumerate
        vars.airdropBalance = IERC721Upgradeable(vars.airdropTokenAddresses[typeIndex]).balanceOf(address(this));
        for (uint256 i = 0; i < vars.airdropBalance; i++) {
          vars.airdropTokenId = IERC721EnumerableUpgradeable(vars.airdropTokenAddresses[typeIndex]).tokenOfOwnerByIndex(
            address(this),
            0
          );
          IERC721EnumerableUpgradeable(vars.airdropTokenAddresses[typeIndex]).safeTransferFrom(
            address(this),
            initiator,
            vars.airdropTokenId
          );
        }
      } else if (vars.airdropTokenTypes[typeIndex] == 3) {
        // ERC1155
        vars.airdropBalance = IERC1155Upgradeable(vars.airdropTokenAddresses[typeIndex]).balanceOf(
          address(this),
          vars.airdropTokenIds[typeIndex]
        );
        IERC1155Upgradeable(vars.airdropTokenAddresses[typeIndex]).safeTransferFrom(
          address(this),
          initiator,
          vars.airdropTokenIds[typeIndex],
          vars.airdropBalance,
          new bytes(0)
        );
      } else if (vars.airdropTokenTypes[typeIndex] == 4) {
        // ERC721 without Enumerate
        IERC721EnumerableUpgradeable(vars.airdropTokenAddresses[typeIndex]).safeTransferFrom(
          address(this),
          initiator,
          vars.airdropTokenIds[typeIndex]
        );
      }
    }

    return true;
  }

  /**
   * @dev call third party contract method, etc. staking, claim...
   * @param targetContract address of target contract
   * @param callParams parameters to call target contract
   */
  function callMethod(
    address targetContract,
    bytes calldata callParams,
    uint256 ethValue
  ) external payable nonReentrant onlyOwner {
    require(targetContract != address(0), "invalid contract address");
    require(callParams.length >= 4, "invalid call parameters");

    // call project claim contract
    AddressUpgradeable.functionCallWithValue(targetContract, callParams, ethValue, "call method failed");
  }

  function approveERC20(
    address token,
    address spender,
    uint256 amount
  ) external nonReentrant onlyOwner {
    IERC20Upgradeable(token).approve(spender, amount);
  }

  /**
   * @dev transfer ERC20 token from contract to owner
   * @param token address of ERC20 token
   * @param amount amount to send
   */
  function transferERC20(address token, uint256 amount) external nonReentrant onlyOwner {
    address to = owner();

    // borrowed tokens can not be transfer to owner
    uint256 balance = IERC20Upgradeable(token).balanceOf(address(this));
    require(balance >= (amount + totalBorrowedERC20FromPartners[token]), "token locked for partner");

    IERC20Upgradeable(token).transfer(to, amount);
  }

  function approveERC721(
    address token,
    address operator,
    uint256 tokenId
  ) external nonReentrant onlyOwner {
    IERC721Upgradeable(token).approve(operator, tokenId);
  }

  function approveERC721ForAll(
    address token,
    address operator,
    bool approved
  ) external nonReentrant onlyOwner {
    IERC721Upgradeable(token).setApprovalForAll(operator, approved);
  }

  /**
   * @dev transfer ERC721 token from contract to owner
   * @param token address of ERC721 token
   * @param id token item to send
   */
  function transferERC721(address token, uint256 id) external nonReentrant onlyOwner {
    address to = owner();

    // borrowed tokens can not be transfer to owner
    require(borrowedERC721FromPartners[token][id] == address(0), "token locked for partner");

    IERC721Upgradeable(token).safeTransferFrom(address(this), to, id);
  }

  function approveERC1155ForAll(
    address token,
    address operator,
    bool approved
  ) external nonReentrant onlyOwner {
    IERC1155Upgradeable(token).setApprovalForAll(operator, approved);
  }

  /**
   * @dev transfer ERC1155 token from contract to owner
   * @param token address of ERC1155 token
   * @param id token item to send
   * @param amount amount to send
   */
  function transferERC1155(
    address token,
    uint256 id,
    uint256 amount
  ) external nonReentrant onlyOwner {
    address to = owner();

    // borrowed tokens can not be transfer to owner
    uint256 balance = IERC1155Upgradeable(token).balanceOf(address(this), id);
    require(balance >= (amount + totalBorrowedERC1155FromPartners[token][id]), "token locked for partner");

    IERC1155Upgradeable(token).safeTransferFrom(address(this), to, id, amount, new bytes(0));
  }

  /**
   * @dev transfer native Ether from contract to owner
   * @param amount amount to send
   */
  function transferEther(uint256 amount) external nonReentrant onlyOwner {
    address to = owner();
    (bool success, ) = to.call{value: amount}(new bytes(0));
    require(success, "ETH_TRANSFER_FAILED");
  }

  /**
   * @dev borrow ERC20 token from partner to contract
   * @param token address of ERC20 token
   * @param amount amount to send
   * @param partner address of partner
   */
  function borrowERC20FromPartner(
    address token,
    uint256 amount,
    address partner
  ) external nonReentrant onlyOwner {
    totalBorrowedERC20FromPartners[token] += amount;
    borrowedERC20FromPartners[token][partner] += amount;
    IERC20Upgradeable(token).transferFrom(partner, address(this), amount);
  }

  /**
   * @dev borrow ERC721 token from partner to contract
   * @param token address of ERC721 token
   * @param id token item to send
   * @param partner address of partner
   */
  function borrowERC721FromPartner(
    address token,
    uint256 id,
    address partner
  ) external nonReentrant onlyOwner {
    borrowedERC721FromPartners[token][id] = partner;
    IERC721Upgradeable(token).safeTransferFrom(partner, address(this), id);
  }

  /**
   * @dev borrow ERC1155 token from partner to contract
   * @param token address of ERC1155 token
   * @param id token item to send
   * @param amount amount to send
   * @param partner address of partner
   */
  function borrowERC1155FromPartner(
    address token,
    uint256 id,
    uint256 amount,
    address partner
  ) external nonReentrant onlyOwner {
    totalBorrowedERC1155FromPartners[token][id] += amount;
    borrowedERC1155FromPartners[token][id][partner] += amount;
    IERC1155Upgradeable(token).safeTransferFrom(partner, address(this), id, amount, new bytes(0));
  }

  /**
   * @dev repay ERC20 token from contract to partner
   * @param token address of ERC20 token
   * @param partner address of partner
   */
  function repayERC20ToPartner(address token, address partner) external nonReentrant {
    uint256 amount = borrowedERC20FromPartners[token][partner];
    require(amount > 0, "zero borrow amount from partner");
    require(totalBorrowedERC20FromPartners[token] >= amount, "amount exceed total");

    require((msg.sender == owner()) || (msg.sender == partner), "invalid caller");

    totalBorrowedERC20FromPartners[token] -= amount;
    borrowedERC20FromPartners[token][partner] = 0;
    IERC20Upgradeable(token).transfer(partner, amount);
  }

  /**
   * @dev repay ERC721 token from contract to partner
   * @param token address of ERC721 token
   * @param id token item to send
   * @param partner address of partner
   */
  function repayERC721ToPartner(
    address token,
    uint256 id,
    address partner
  ) external nonReentrant {
    require(borrowedERC721FromPartners[token][id] == partner, "invalid partner");

    require((msg.sender == owner()) || (msg.sender == partner), "invalid caller");

    borrowedERC721FromPartners[token][id] = address(0);
    IERC721Upgradeable(token).safeTransferFrom(address(this), partner, id);
  }

  /**
   * @dev repay ERC1155 token from contract to partner
   * @param token address of ERC1155 token
   * @param id token item to send
   * @param partner address of partner
   */
  function repayERC1155ToPartner(
    address token,
    uint256 id,
    address partner
  ) external nonReentrant {
    uint256 amount = borrowedERC1155FromPartners[token][id][partner];
    require(amount > 0, "zero borrow amount from partner");
    require(totalBorrowedERC1155FromPartners[token][id] >= amount, "amount exceed total");

    require((msg.sender == owner()) || (msg.sender == partner), "invalid caller");

    totalBorrowedERC1155FromPartners[token][id] -= amount;
    borrowedERC1155FromPartners[token][id][partner] = 0;
    IERC1155Upgradeable(token).safeTransferFrom(address(this), partner, id, amount, new bytes(0));
  }

  /**
   * @dev query claim record
   */
  function getAirdropClaimRecord(
    address initiator,
    address nftAsset,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) public view returns (bool) {
    bytes32 airdropKeyHash = getClaimKeyHash(initiator, nftAsset, nftTokenIds, params);
    return airdropClaimRecords[airdropKeyHash];
  }

  /**
   * @dev encode flash claim parameters
   */
  function encodeFlashLoanParams(
    uint256[] calldata airdropTokenTypes,
    address[] calldata airdropTokenAddresses,
    uint256[] calldata airdropTokenIds,
    address airdropContract,
    bytes calldata airdropParams
  ) public pure returns (bytes memory) {
    return abi.encode(airdropTokenTypes, airdropTokenAddresses, airdropTokenIds, airdropContract, airdropParams);
  }

  /**
   * @dev query claim key hash
   */
  function getClaimKeyHash(
    address initiator,
    address nftAsset,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(initiator, nftAsset, nftTokenIds, params));
  }

  receive() external payable {}
}
