// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "../interfaces/IBNFT.sol";
import "../interfaces/IBNFTInterceptor.sol";

contract MockTokenInterceptor is IBNFTInterceptor {
  bool public isPreHandleMintCalled;
  bool public isPreHandleBurnCalled;

  function resetCallState() public {
    isPreHandleMintCalled = false;
    isPreHandleBurnCalled = false;
  }

  function preHandleMint(address nftAsset, uint256 nftTokenId) public override returns (bool) {
    nftAsset;
    nftTokenId;
    isPreHandleMintCalled = true;
    return true;
  }

  function preHandleBurn(address nftAsset, uint256 nftTokenId) public override returns (bool) {
    nftAsset;
    nftTokenId;
    isPreHandleBurnCalled = true;
    return true;
  }
}
