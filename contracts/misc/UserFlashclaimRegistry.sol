// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "./AirdropFlashLoanReceiver.sol";

contract UserFlashclaimRegistry {
  mapping(address => address) public userReceivers;

  address public bnftRegistry;

  constructor(address bnftRegistry_) {
    bnftRegistry = bnftRegistry_;
  }

  function createReceiver() public {
    AirdropFlashLoanReceiver receiver = new AirdropFlashLoanReceiver(bnftRegistry);
    userReceivers[msg.sender] = address(receiver);
  }

  function getReceiver(address user) public view returns (address) {
    return userReceivers[user];
  }
}
