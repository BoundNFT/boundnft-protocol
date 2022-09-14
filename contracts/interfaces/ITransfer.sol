// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface ITransfer {
  function transferNonFungibleToken(
    address token,
    address from,
    address to,
    uint256 tokenId,
    uint256 amount
  ) external returns (bool);
}
