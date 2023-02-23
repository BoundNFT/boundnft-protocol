// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {IMoonbirds} from "../interfaces/IMoonbirds.sol";

import {MintableERC721} from "./MintableERC721.sol";

contract MockMoonbirds is IMoonbirds, MintableERC721 {
  mapping(uint256 => uint256) public nestingStarted;
  mapping(uint256 => uint256) public nestingTotal;

  constructor(string memory name, string memory symbol) MintableERC721(name, symbol) {}

  function toggleNesting(uint256[] calldata tokenIds) public override {
    for (uint256 i = 0; i < tokenIds.length; i++) {
      uint256 tokenId = tokenIds[i];
      uint256 start = nestingStarted[tokenId];
      if (start == 0) {
        nestingStarted[tokenId] = block.timestamp;
      } else {
        nestingTotal[tokenId] += block.timestamp - start;
        nestingStarted[tokenId] = 0;
      }
    }
  }

  function nestingPeriod(uint256 tokenId)
    external
    view
    returns (
      bool nesting,
      uint256 current,
      uint256 total
    )
  {
    uint256 start = nestingStarted[tokenId];
    if (start != 0) {
      nesting = true;
      current = block.timestamp - start;
    }
    total = current + nestingTotal[tokenId];
  }
}
