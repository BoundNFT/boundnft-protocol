// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

interface IUserFlashclaimRegistryV3 {
  function createReceiver() external;

  function flashLoan(
    address nftAsset,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) external;

  function getUserReceiver(address user) external view returns (address);

  function getCurrentReceiverVersion() external view returns (uint256);

  function getBNFTRegistry() external view returns (address);

  function validateAirdropCommonAddressess(address airdropContract, address[] calldata airdropTokenAddresses)
    external
    view;
}
