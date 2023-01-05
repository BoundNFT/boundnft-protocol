// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "../misc/ILendPoolAddressesProvider.sol";

contract MockLendPoolAddressesProvider is ILendPoolAddressesProvider {
  address public poolLoan;

  function setLendPoolLoan(address poolLoan_) public {
    poolLoan = poolLoan_;
  }

  function getLendPoolLoan() public view override returns (address) {
    return poolLoan;
  }
}
