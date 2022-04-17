// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol";

contract MockVRFCoordinatorV2 is VRFCoordinatorV2Mock {
  constructor(uint96 _baseFee, uint96 _gasPriceLink) VRFCoordinatorV2Mock(_baseFee, _gasPriceLink) {}
}
