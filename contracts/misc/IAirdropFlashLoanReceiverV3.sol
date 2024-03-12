// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

interface IAirdropFlashLoanReceiverV3 {
  function initialize(address owner_, address claimRegistry_) external;

  function VERSION() external view returns (uint256);

  function getVersion() external view returns (uint256);
}
