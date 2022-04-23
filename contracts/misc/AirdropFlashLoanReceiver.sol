// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "../interfaces/IFlashLoanReceiver.sol";
import "../interfaces/IBNFT.sol";

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract AirdropFlashLoanReceiver is IFlashLoanReceiver, ERC721Holder, ERC1155Holder {
  address public immutable bnftRegistry;
  mapping(bytes32 => uint256) public airdropClaimRecords;

  constructor(address bnftRegistry_) {
    bnftRegistry = bnftRegistry_;
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
  }

  function executeOperation(
    address nftAsset,
    uint256[] calldata nftTokenIds,
    address initiator,
    address operator,
    bytes calldata params
  ) external override returns (bool) {
    ExecuteOperationLocalVars memory vars;

    require(nftTokenIds.length > 0, "empty token list");

    // decode parameters
    (
      vars.airdropTokenTypes,
      vars.airdropTokenAddresses,
      vars.airdropTokenIds,
      vars.airdropContract,
      vars.airdropParams
    ) = abi.decode(params, (uint256[], address[], uint256[], address, bytes));

    require(vars.airdropTokenTypes.length > 0, "invalid airdrop token type");
    require(vars.airdropTokenAddresses.length == vars.airdropTokenTypes.length, "invalid airdrop token address length");
    require(vars.airdropTokenIds.length == vars.airdropTokenTypes.length, "invalid airdrop token id length");

    require(vars.airdropContract != address(0), "invalid airdrop contract address");
    require(vars.airdropParams.length >= 4, "invalid airdrop parameters");

    // allow operator transfer borrowed nfts back to bnft
    IERC721(nftAsset).setApprovalForAll(operator, true);

    // call project aidrop contract
    Address.functionCall(vars.airdropContract, vars.airdropParams, "call airdrop method failed");

    vars.airdropKeyHash = _getClaimKeyHash(initiator, nftAsset, nftTokenIds, params);

    // transfer airdrop tokens to borrower
    for (uint256 typeIndex = 0; typeIndex < vars.airdropTokenTypes.length; typeIndex++) {
      require(vars.airdropTokenAddresses[typeIndex] != address(0), "invalid airdrop token address");

      if (vars.airdropTokenTypes[typeIndex] == 1) {
        // ERC20
        vars.airdropBalance = IERC20(vars.airdropTokenAddresses[typeIndex]).balanceOf(address(this));
        if (vars.airdropBalance > 0) {
          airdropClaimRecords[vars.airdropKeyHash] += vars.airdropBalance;

          IERC20(vars.airdropTokenAddresses[typeIndex]).transfer(initiator, vars.airdropBalance);
        }
      } else if (vars.airdropTokenTypes[typeIndex] == 2) {
        // ERC721
        vars.airdropBalance = IERC721(vars.airdropTokenAddresses[typeIndex]).balanceOf(address(this));
        airdropClaimRecords[vars.airdropKeyHash] += vars.airdropBalance;

        for (uint256 i = 0; i < vars.airdropBalance; i++) {
          vars.airdropTokenId = IERC721Enumerable(vars.airdropTokenAddresses[typeIndex]).tokenOfOwnerByIndex(
            address(this),
            0
          );
          IERC721Enumerable(vars.airdropTokenAddresses[typeIndex]).safeTransferFrom(
            address(this),
            initiator,
            vars.airdropTokenId
          );
        }
      } else if (vars.airdropTokenTypes[typeIndex] == 3) {
        // ERC1155
        vars.airdropBalance = IERC1155(vars.airdropTokenAddresses[typeIndex]).balanceOf(
          address(this),
          vars.airdropTokenIds[typeIndex]
        );
        airdropClaimRecords[vars.airdropKeyHash] += vars.airdropBalance;

        IERC1155(vars.airdropTokenAddresses[typeIndex]).safeTransferFrom(
          address(this),
          initiator,
          vars.airdropTokenIds[typeIndex],
          vars.airdropBalance,
          new bytes(0)
        );
      }
    }

    return true;
  }

  function getAirdropClaimRecord(
    address initiator,
    address nftAsset,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) public view returns (uint256) {
    bytes32 airdropKeyHash = _getClaimKeyHash(initiator, nftAsset, nftTokenIds, params);
    return airdropClaimRecords[airdropKeyHash];
  }

  function encodeFlashLoanParams(
    uint256[] calldata airdropTokenTypes,
    address[] calldata airdropTokenAddresses,
    uint256[] calldata airdropTokenIds,
    address airdropContract,
    bytes calldata airdropParams
  ) public pure returns (bytes memory) {
    return abi.encode(airdropTokenTypes, airdropTokenAddresses, airdropTokenIds, airdropContract, airdropParams);
  }

  function getClaimKeyHash(
    address initiator,
    address nftAsset,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) public pure returns (bytes32) {
    return _getClaimKeyHash(initiator, nftAsset, nftTokenIds, params);
  }

  function _getClaimKeyHash(
    address initiator,
    address nftAsset,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(initiator, nftAsset, nftTokenIds, params));
  }
}
