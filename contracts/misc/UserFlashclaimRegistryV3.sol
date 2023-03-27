// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../interfaces/IBNFT.sol";
import "../interfaces/IBNFTRegistry.sol";
import "./ILendPoolAddressesProvider.sol";
import "./ILendPoolLoan.sol";
import "./IStakeManager.sol";

import "./IUserFlashclaimRegistryV3.sol";
import "./IAirdropFlashLoanReceiverV3.sol";

contract UserFlashclaimRegistryV3 is OwnableUpgradeable, ReentrancyGuardUpgradeable, IUserFlashclaimRegistryV3 {
  using ClonesUpgradeable for address;
  using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;

  uint256 public constant VERSION = 301;

  address public bnftRegistry;
  mapping(address => address) public userReceiversV3;
  mapping(address => bool) public allReceiversV3;
  address public receiverV3Implemention;
  mapping(address => EnumerableSetUpgradeable.AddressSet) private _airdropContractWhiteList;
  address public addressProvider;
  address public stakeManager;
  mapping(address => EnumerableSetUpgradeable.AddressSet) private _airdropTokenWhiteList;
  mapping(address => bool) private _airdropCommonAddressWhiteList;

  event ReceiverV3ImplementionUpdated(address indexed receiverV3Implemention);
  event AirdropContractWhiteListChanged(address indexed nftAsset, address indexed airdropContract, bool flag);
  event ReceiverCreated(address indexed user, address indexed receiver, uint256 version);
  event AirdropTokenWhiteListChanged(address indexed nftAsset, address indexed airdropToken, bool flag);
  event AirdropCommonAddressWhiteListChanged(address indexed commonAddress, bool flag);

  function initialize(
    address bnftRegistry_,
    address addressProvider_,
    address stakeManager_,
    address receiverV3Implemention_
  ) public initializer {
    __Ownable_init();

    bnftRegistry = bnftRegistry_;
    addressProvider = addressProvider_;
    stakeManager = stakeManager_;

    receiverV3Implemention = receiverV3Implemention_;
  }

  function setReceiverV3Implemention(address receiverV3Implemention_) public onlyOwner {
    receiverV3Implemention = receiverV3Implemention_;

    emit ReceiverV3ImplementionUpdated(receiverV3Implemention_);
  }

  function setAirdropContractWhiteList(
    address nftAsset,
    address airdropContract,
    bool flag
  ) public onlyOwner {
    if (flag) {
      _airdropContractWhiteList[nftAsset].add(airdropContract);
    } else {
      _airdropContractWhiteList[nftAsset].remove(airdropContract);
    }

    emit AirdropContractWhiteListChanged(nftAsset, airdropContract, flag);
  }

  function setAirdropTokenWhiteList(
    address nftAsset,
    address airdropToken,
    bool flag
  ) public onlyOwner {
    if (flag) {
      _airdropTokenWhiteList[nftAsset].add(airdropToken);
    } else {
      _airdropTokenWhiteList[nftAsset].remove(airdropToken);
    }

    emit AirdropTokenWhiteListChanged(nftAsset, airdropToken, flag);
  }

  function setAirdropCommonAddressWhiteList(address[] calldata commonAddresses, bool flag) public onlyOwner {
    for (uint256 i = 0; i < commonAddresses.length; i++) {
      _airdropCommonAddressWhiteList[commonAddresses[i]] = flag;
      emit AirdropCommonAddressWhiteListChanged(commonAddresses[i], flag);
    }
  }

  /**
   * @dev Allows user create receiver.
   *
   * Requirements:
   *  - Receiver not exist for the `caller`.
   *
   */
  function createReceiver() public override nonReentrant {
    address existReceiver = userReceiversV3[msg.sender];
    if (existReceiver != address(0)) {
      // no need to create new receiver fo the same version
      require(
        getCurrentReceiverVersion() != IAirdropFlashLoanReceiverV3(existReceiver).VERSION(),
        "user already has a receiver"
      );

      // delete old version first
      _deleteReceiver();
    }

    _createReceiver();
  }

  /**
   * @dev Allows user receiver to access the tokens within one transaction, as long as the tokens taken is returned.
   *
   * Requirements:
   *  - `nftTokenIds` must exist.
   *
   * @param nftAsset The address of the underlying asset
   * @param nftTokenIds token ids of the underlying asset
   * @param params Variadic packed params to pass to the receiver as extra information
   */
  function flashLoan(
    address nftAsset,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) public override nonReentrant {
    address lendPoolLoan = ILendPoolAddressesProvider(addressProvider).getLendPoolLoan();

    (address bnftProxy, ) = IBNFTRegistry(bnftRegistry).getBNFTAddresses(nftAsset);
    require(bnftProxy != address(0), "invalid nft asset");

    address receiverAddress = getUserReceiver(msg.sender);
    require(receiverAddress != address(0), "empty user receiver");

    // check airdrop contract MUST in the whitelist
    _checkValidAirdropContract(nftAsset, params);

    // check owner and set locking flag
    for (uint256 i = 0; i < nftTokenIds.length; i++) {
      require(IERC721Upgradeable(bnftProxy).ownerOf(nftTokenIds[i]) == msg.sender, "invalid token owner");

      address minterAddr = IBNFT(bnftProxy).minterOf(nftTokenIds[i]);
      address[] memory lockers = IBNFT(bnftProxy).getFlashLoanLocked(nftTokenIds[i], minterAddr);
      require(lockers.length > 0, "flash loan not locked");

      if (minterAddr == lendPoolLoan) {
        ILendPoolLoan(lendPoolLoan).setFlashLoanLocking(nftAsset, nftTokenIds[i], true);
      } else if (minterAddr == stakeManager) {
        IStakeManager(stakeManager).setFlashLoanLocking(nftAsset, nftTokenIds[i], true);
      }
    }

    // doing flash loan
    IBNFT(bnftProxy).flashLoan(receiverAddress, nftTokenIds, params);

    // clear locking flag
    for (uint256 i = 0; i < nftTokenIds.length; i++) {
      address minterAddr = IBNFT(bnftProxy).minterOf(nftTokenIds[i]);
      if (minterAddr == lendPoolLoan) {
        ILendPoolLoan(lendPoolLoan).setFlashLoanLocking(nftAsset, nftTokenIds[i], false);
      } else if (minterAddr == stakeManager) {
        IStakeManager(stakeManager).setFlashLoanLocking(nftAsset, nftTokenIds[i], false);
      }
    }
  }

  /**
   * @dev Validate airdrop common addresses.
   */
  function validateAirdropCommonAddressess(address airdropContract, address[] calldata airdropTokenAddresses)
    public
    view
    override
  {
    require(isAirdropCommonAddressInWhiteList(airdropContract) == true, "invalid airdrop contract");

    for (uint256 i = 0; i < airdropTokenAddresses.length; i++) {
      require(isAirdropCommonAddressInWhiteList(airdropTokenAddresses[i]) == true, "invalid airdrop token");
    }
  }

  /**
   * @dev Query user receiver, only compatable with v2.
   */
  function userReceivers(address user) public view returns (address) {
    return getUserReceiver(user);
  }

  /**
   * @dev Query user receiver, current in used.
   */
  function getUserReceiver(address user) public view override returns (address) {
    address existReceiver = userReceiversV3[user];
    if (existReceiver != address(0)) {
      if (getCurrentReceiverVersion() != IAirdropFlashLoanReceiverV3(existReceiver).VERSION()) {
        return address(0);
      }
    }

    return existReceiver;
  }

  function getCurrentReceiverVersion() public view override returns (uint256) {
    return IAirdropFlashLoanReceiverV3(receiverV3Implemention).VERSION();
  }

  function getBNFTRegistry() public view override returns (address) {
    return bnftRegistry;
  }

  function isAirdropContractInWhiteList(address nftAsset, address airdropContract) public view returns (bool) {
    return _airdropContractWhiteList[nftAsset].contains(airdropContract);
  }

  function isAirdropTokenInWhiteList(address nftAsset, address airdropToken) public view returns (bool) {
    return _airdropTokenWhiteList[nftAsset].contains(airdropToken);
  }

  function isAirdropCommonAddressInWhiteList(address commonAddress) public view returns (bool) {
    return _airdropCommonAddressWhiteList[commonAddress];
  }

  function isNftFlashLoanLocked(address nftAsset, uint256 tokenId) public view returns (bool) {
    (address bnftProxy, ) = IBNFTRegistry(bnftRegistry).getBNFTAddresses(nftAsset);
    require(bnftProxy != address(0), "invalid nft asset");

    address minterAddr = IBNFT(bnftProxy).minterOf(tokenId);
    address[] memory lockers = IBNFT(bnftProxy).getFlashLoanLocked(tokenId, minterAddr);
    return (lockers.length > 0);
  }

  function _createReceiver() internal {
    address payable receiverV3 = payable(receiverV3Implemention.clone());
    IAirdropFlashLoanReceiverV3(receiverV3).initialize(msg.sender, address(this));

    userReceiversV3[msg.sender] = address(receiverV3);
    allReceiversV3[receiverV3] = true;

    emit ReceiverCreated(msg.sender, address(receiverV3), VERSION);
  }

  function _deleteReceiver() internal {
    delete allReceiversV3[userReceiversV3[msg.sender]];
    delete userReceiversV3[msg.sender];
  }

  function _checkValidAirdropContract(address nftAsset, bytes calldata params) internal view {
    // decode parameters
    (, address[] memory airdropTokenAddresses, , address airdropContract, , ) = abi.decode(
      params,
      (uint256[], address[], uint256[], address, bytes, uint256)
    );
    require(isAirdropContractInWhiteList(nftAsset, airdropContract) == true, "invalid airdrop contract");

    for (uint256 i = 0; i < airdropTokenAddresses.length; i++) {
      require(isAirdropTokenInWhiteList(nftAsset, airdropTokenAddresses[i]) == true, "invalid airdrop token");
    }
  }
}
