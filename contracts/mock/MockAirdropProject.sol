// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.4;

import "./MintableERC20.sol";
import "./MintableERC721.sol";
import "./MintableERC1155.sol";
import "../interfaces/IBNFTRegistry.sol";
import "../interfaces/IBNFT.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract MockAirdropProject is ERC721Holder, ERC1155Holder {
  IBNFTRegistry public bnftRegistry;

  MintableERC20 public erc20Token;
  MintableERC721 public erc721Token;
  MintableERC1155 public erc1155Token;

  uint256 public erc20Bonus;
  uint256 public erc721Bonus;
  uint256 public erc1155Bonus;
  uint256 public erc1155IdMin;
  uint256 public erc1155IdMax;

  mapping(address => mapping(uint256 => bool)) public airdrops;

  constructor(address bnftRegistry_) {
    bnftRegistry = IBNFTRegistry(bnftRegistry_);

    erc20Bonus = 100 * 10**18;
    erc721Bonus = 1;
    erc1155Bonus = 1;
    erc1155IdMin = 1;
    erc1155IdMax = 3;

    erc20Token = new MintableERC20("BNFT Mock Airdrop ERC20", "BMAD20", 18);
    erc721Token = new MintableERC721("BNFT Mock Airdrop ERC721", "BMAD721");
    erc1155Token = new MintableERC1155();

    erc20Token.mint(1000000 * 10**18);

    for (uint256 i = erc1155IdMin; i <= erc1155IdMax; i++) {
      erc1155Token.mint(i, 10000);
    }
  }

  function nativeApplyAirdrop(address nftAsset, uint256 tokenId) public {
    _airdrop(nftAsset, tokenId, true, true);
  }

  function bnftApplyAirdrop(address nftAsset, uint256 tokenId) public {
    _airdrop(nftAsset, tokenId, false, true);
  }

  function bnftSnapshotAirdrop(address nftAsset, uint256 tokenId) public {
    _airdrop(nftAsset, tokenId, false, false);
  }

  function bnftSnapshotAirdropBatch(address nftAsset, uint256[] calldata tokenIds) public {
    for (uint256 i = 0; i < tokenIds.length; i++) {
      _airdrop(nftAsset, tokenIds[i], false, false);
    }
  }

  function _airdrop(
    address nftAsset,
    uint256 tokenId,
    bool isNative,
    bool isApplied
  ) internal {
    require(false == airdrops[nftAsset][tokenId], "nft has been airdroped");
    address to = msg.sender;

    if (!isNative) {
      (address bnftProxy, ) = bnftRegistry.getBNFTAddresses(nftAsset);
      require(bnftProxy != address(0), "bnft not created");
      require(bnftProxy == IERC721(nftAsset).ownerOf(tokenId), "bnft is not nft owner");

      if (isApplied) {
        require(msg.sender == IERC721(bnftProxy).ownerOf(tokenId), "caller is not bnft owner");
        to = msg.sender;
      } else {
        to = bnftProxy;
      }
    } else {
      require(msg.sender == IERC721(nftAsset).ownerOf(tokenId), "caller is not nft owner");
      to = msg.sender;
    }

    airdrops[nftAsset][tokenId] = true;

    erc20Token.transfer(to, erc20Bonus);

    erc721Token.mint(tokenId);
    erc721Token.safeTransferFrom(address(this), to, tokenId);

    uint256 erc1155TokenId = (tokenId % erc1155IdMax) + 1;
    erc1155Token.safeTransferFrom(address(this), to, erc1155TokenId, erc1155Bonus, new bytes(0));
  }

  function getERC1155TokenId(uint256 nftTokenId) public view returns (uint256) {
    return (nftTokenId % erc1155IdMax) + 1;
  }
}
