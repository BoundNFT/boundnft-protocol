// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract MockDelegationRegistry {
  using EnumerableSet for EnumerableSet.AddressSet;

  mapping(bytes32 => bool) public allDelegateInfos;
  mapping(address => mapping(address => mapping(uint256 => EnumerableSet.AddressSet))) private _allDelegateAddrs;

  function delegateForToken(
    address delegate,
    address contract_,
    uint256 tokenId,
    bool value
  ) public {
    bytes32 delegateHash = keccak256(abi.encodePacked(msg.sender, contract_, tokenId, delegate));
    if (value) {
      allDelegateInfos[delegateHash] = value;

      _allDelegateAddrs[msg.sender][contract_][tokenId].add(delegate);
    } else {
      delete allDelegateInfos[delegateHash];

      _allDelegateAddrs[msg.sender][contract_][tokenId].remove(delegate);
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

  function getDelegatesForToken(
    address vault,
    address contract_,
    uint256 tokenId
  ) external view returns (address[] memory) {
    return _allDelegateAddrs[vault][contract_][tokenId].values();
  }
}
