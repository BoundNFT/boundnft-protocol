// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC20Mintable
 * @dev ERC20 minting logic
 */
contract MintableERC20 is Ownable, ERC20 {
  uint8 private _decimals;
  mapping(address => uint256) public mintValues;

  constructor(
    string memory name,
    string memory symbol,
    uint8 decimals_
  ) Ownable() ERC20(name, symbol) {
    _setupDecimals(decimals_);
  }

  function _setupDecimals(uint8 decimals_) internal {
    _decimals = decimals_;
  }

  function decimals() public view virtual override returns (uint8) {
    return _decimals;
  }

  /**
   * @dev Function to mint tokens
   * @param value The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(uint256 value) public returns (bool) {
    mintValues[_msgSender()] += value;
    require(mintValues[_msgSender()] < (1000000 * (10**_decimals)), "exceed mint limit");

    _mint(_msgSender(), value);
    return true;
  }

  function privateMint(uint256 value) public onlyOwner returns (bool) {
    _mint(_msgSender(), value);
    return true;
  }
}
