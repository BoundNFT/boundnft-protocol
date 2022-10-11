// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import {IBNFT} from "../interfaces/IBNFT.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract MockBNFTMinter is ERC721Holder {
  address private _bnftAddress;
  address private _nftAddress;

  constructor(address nftAddress_, address bnftAddress_) {
    _bnftAddress = bnftAddress_;
    _nftAddress = nftAddress_;

    IERC721(_nftAddress).setApprovalForAll(_bnftAddress, true);
  }

  function mint(address to, uint256 tokenId) public {
    IERC721(_nftAddress).safeTransferFrom(msg.sender, address(this), tokenId);

    IBNFT(_bnftAddress).mint(to, tokenId);
  }

  function burn(uint256 tokenId) public {
    IBNFT(_bnftAddress).burn(tokenId);

    IERC721(_nftAddress).safeTransferFrom(address(this), msg.sender, tokenId);
  }

  function flashLoan(
    address receiverAddress,
    uint256[] calldata nftTokenIds,
    bytes calldata params
  ) public {
    IBNFT(_bnftAddress).flashLoan(receiverAddress, nftTokenIds, params);
  }
}
