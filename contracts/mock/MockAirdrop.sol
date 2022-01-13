// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "./MintableERC20.sol";
import "./MintableERC721.sol";
import "./MintableERC1155.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";

contract MockAirdrop {
  MintableERC20 public erc20;
  mapping(address => mapping(uint256 => uint256)) public erc20Mints;

  MintableERC721 public erc721;
  mapping(address => mapping(uint256 => uint256)) public erc721Mints;

  MintableERC1155 public erc1155;
  mapping(address => mapping(uint256 => uint256)) public erc1155Mints;

  constructor() {
    erc20 = new MintableERC20("BNFT Mock Airdrop ERC20", "AD20", 18);
    erc721 = new MintableERC721("BNFT Mock Airdrop ERC721", "AD721");
    erc1155 = new MintableERC1155();
  }

  function airdropERC20(address nftAsset, uint256 tokenId) public {
    require(msg.sender == IERC721(nftAsset).ownerOf(tokenId), "caller is not nft owner");
    require(erc20Mints[nftAsset][tokenId] == 0, "nft token has airdroped");

    erc20Mints[nftAsset][tokenId] = 1000 * 10**18;

    erc20.mint(erc20Mints[nftAsset][tokenId]);

    erc20.transfer(msg.sender, erc20Mints[nftAsset][tokenId]);
  }

  function airdropERC721(address nftAsset, uint256 tokenId) public {
    require(msg.sender == IERC721(nftAsset).ownerOf(tokenId), "caller is not nft owner");
    require(erc721Mints[nftAsset][tokenId] == 0, "nft token has airdroped");

    erc721Mints[nftAsset][tokenId] = 1;

    erc721.mint(tokenId);

    erc721.safeTransferFrom(address(this), msg.sender, tokenId);
  }

  function airdropERC1155(address nftAsset, uint256 tokenId) public {
    require(msg.sender == IERC721(nftAsset).ownerOf(tokenId), "caller is not nft owner");
    require(erc1155Mints[nftAsset][tokenId] == 0, "nft token has airdroped");

    erc1155Mints[nftAsset][tokenId] = 10;

    erc1155.mint(tokenId, erc1155Mints[nftAsset][tokenId]);

    erc1155.safeTransferFrom(address(this), msg.sender, tokenId, erc721Mints[nftAsset][tokenId], new bytes(0));
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
