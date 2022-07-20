// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

/**
 * @dev Interface for Azuki Tiger contract
 */
interface IAzukiTiger {
  function azukiCanClaim(uint256 tokenId) external view returns (bool);

  function claim(uint256[] calldata azukiTokenIds) external;
}
