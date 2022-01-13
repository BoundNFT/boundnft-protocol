// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

/**
 * @title MintableERC1155
 * @dev ERC1155 minting logic
 */
contract MintableERC1155 is ERC1155 {
  mapping(address => uint256) public mintCounts;
  mapping(address => mapping(uint256 => uint256)) public mintIdCounts;

  constructor() ERC1155("https://MintableERC1155/") {}

  /**
   * @dev Function to mint tokens
   * @param id The id of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(uint256 id, uint256 amount) public returns (bool) {
    require(id < 10000, "exceed mint limit");

    mintCounts[_msgSender()] += 1;
    require(mintCounts[_msgSender()] <= 10, "exceed mint limit");

    mintIdCounts[_msgSender()][id] += amount;
    require(mintIdCounts[_msgSender()][id] <= 100, "exceed id mint limit");

    _mint(_msgSender(), id, amount, new bytes(0));
    return true;
  }

  function setURI(string memory uri_) public {
    _setURI(uri_);
  }
}
