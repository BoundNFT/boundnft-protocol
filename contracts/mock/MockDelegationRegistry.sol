// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

contract MockDelegationRegistry {
  mapping(bytes32 => bool) public allDelegateInfos;

  function delegateForToken(
    address delegate,
    address contract_,
    uint256 tokenId,
    bool value
  ) public {
    bytes32 delegateHash = keccak256(abi.encodePacked(msg.sender, contract_, tokenId, delegate));
    if (value) {
      allDelegateInfos[delegateHash] = value;
    } else {
      delete allDelegateInfos[delegateHash];
    }
  }

  function checkDelegateForToken(
    address delegate,
    address vault,
    address contract_,
    uint256 tokenId
  ) public view returns (bool) {
    bytes32 delegateHash = keccak256(abi.encodePacked(vault, contract_, tokenId, delegate));
    return allDelegateInfos[delegateHash];
  }
}
