// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

/**
 * @dev Interface for CloneX Egg contract
 */
interface ICloneXEgg {
  function claimedClone(uint256 tokenId) external view returns (bool);

  function mint(uint256[] calldata cloneIds) external;
}
