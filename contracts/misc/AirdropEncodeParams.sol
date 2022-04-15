// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "./IApeCoinAirdrop.sol";

contract AirdropEncodeParams {
  function encodeApeCoinParams() public pure returns (bytes memory) {
    return abi.encode(IApeCoinAirdrop.claimTokens.selector);
  }
}
