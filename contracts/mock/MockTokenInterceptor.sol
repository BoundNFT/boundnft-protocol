// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "../interfaces/IBNFT.sol";
import "../interfaces/IBNFTBurnInterceptor.sol";

contract MockTokenInterceptor is IBNFTBurnInterceptor {
  bool public isBeforeTokenBurnCalled;
  bool public isAfterTokenBurnCalled;

  event BeforeTokenBurn(address indexed nftAsset, uint256 nftTokenId);
  event AfterTokenBurn(address indexed nftAsset, uint256 nftTokenId);

  function resetCallState() public {
    isBeforeTokenBurnCalled = false;
  }

  function beforeTokenBurn(address nftAsset, uint256 nftTokenId) public override returns (bool) {
    nftAsset;
    nftTokenId;
    isBeforeTokenBurnCalled = true;
    emit BeforeTokenBurn(nftAsset, nftTokenId);
    return true;
  }

  function afterTokenBurn(address nftAsset, uint256 nftTokenId) public override returns (bool) {
    nftAsset;
    nftTokenId;
    isAfterTokenBurnCalled = true;
    emit AfterTokenBurn(nftAsset, nftTokenId);
    return true;
  }
}
