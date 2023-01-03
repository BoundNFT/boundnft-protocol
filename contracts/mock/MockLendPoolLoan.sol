// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "../interfaces/IBNFT.sol";
import "../interfaces/IBNFTRegistry.sol";
import "../misc/ILendPoolLoan.sol";

contract MockLendPoolLoan is ILendPoolLoan, ERC721Holder {
  address public bnftRegistry;

  constructor(address bnftRegistry_) {
    bnftRegistry = bnftRegistry_;
  }

  function createLoan(
    address nftAsset,
    address to,
    uint256 tokenId
  ) public {
    IERC721(nftAsset).safeTransferFrom(msg.sender, address(this), tokenId);

    (address bnftProxy, ) = IBNFTRegistry(bnftRegistry).getBNFTAddresses(nftAsset);
    IERC721(nftAsset).approve(bnftProxy, tokenId);

    IBNFT(bnftProxy).mint(to, tokenId);
  }

  function deleteLoan(address nftAsset, uint256 tokenId) public {
    (address bnftProxy, ) = IBNFTRegistry(bnftRegistry).getBNFTAddresses(nftAsset);
    IBNFT(bnftProxy).burn(tokenId);

    IERC721(nftAsset).safeTransferFrom(address(this), msg.sender, tokenId);
  }

  function setFlashLoanLocking(
    address nftAsset,
    uint256 tokenId,
    bool locked
  ) public override {
    (address bnftProxy, ) = IBNFTRegistry(bnftRegistry).getBNFTAddresses(nftAsset);

    IBNFT(bnftProxy).setFlashLoanLocking(tokenId, msg.sender, locked);
  }
}
