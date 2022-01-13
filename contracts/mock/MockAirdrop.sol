// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "./MintableERC20.sol";
import "./MintableERC721.sol";
import "./MintableERC1155.sol";
import "../interfaces/IBNFTRegistry.sol";
import "../interfaces/IBNFT.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract MockAirdrop {
  IBNFTRegistry public bnftRegistry;

  MintableERC20 public erc20;
  MintableERC721 public erc721;
  MintableERC1155 public erc1155;

  mapping(address => mapping(uint256 => bool)) public airdrops;

  constructor(address bnftRegistry_) {
    bnftRegistry = IBNFTRegistry(bnftRegistry_);

    erc20 = new MintableERC20("BNFT Mock Airdrop ERC20", "BMAD20", 18);
    erc721 = new MintableERC721("BNFT Mock Airdrop ERC721", "BMAD721");
    erc1155 = new MintableERC1155();
  }

  function applyAirdrop(address nftAsset, uint256 tokenId) public {
    _airdrop(nftAsset, tokenId, true);
  }

  function snapshotAirdrop(address nftAsset, uint256 tokenId) public {
    _airdrop(nftAsset, tokenId, false);
  }

  function _airdrop(
    address nftAsset,
    uint256 tokenId,
    bool isApplied
  ) internal {
    require(false == airdrops[nftAsset][tokenId], "nft has been airdroped");

    (address bnftProxy, ) = bnftRegistry.getBNFTAddresses(nftAsset);
    require(bnftProxy != address(0), "bnft not created");

    require(bnftProxy == IERC721(nftAsset).ownerOf(tokenId), "bnft is not nft owner");

    address to = bnftProxy;
    if (isApplied) {
      require(msg.sender == IERC721(bnftProxy).ownerOf(tokenId), "caller is not bnft owner");
      to = msg.sender;
    }

    airdrops[nftAsset][tokenId] = true;

    erc20.mint(1000 * 10**18);
    erc20.transfer(to, 1000 * 10**18);

    erc721.mint(tokenId);
    erc721.safeTransferFrom(address(this), to, tokenId);

    erc1155.mint(tokenId, 10);
    erc1155.safeTransferFrom(address(this), to, tokenId, 10, new bytes(0));
  }

  function onERC721Received(
    address operator,
    address from,
    uint256 tokenId,
    bytes calldata data
  ) external pure returns (bytes4) {
    operator;
    from;
    tokenId;
    data;
    return IERC721Receiver.onERC721Received.selector;
  }

  function onERC1155Received(
    address operator,
    address from,
    uint256 id,
    uint256 value,
    bytes calldata data
  ) external pure returns (bytes4) {
    operator;
    from;
    id;
    value;
    data;
    return IERC1155Receiver.onERC1155Received.selector;
  }

  function onERC1155BatchReceived(
    address operator,
    address from,
    uint256[] calldata ids,
    uint256[] calldata values,
    bytes calldata data
  ) external pure returns (bytes4) {
    operator;
    from;
    ids;
    values;
    data;
    return IERC1155Receiver.onERC1155BatchReceived.selector;
  }
}
