// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "../interfaces/IFlashLoanReceiver.sol";
import "../interfaces/IBNFT.sol";

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract AirdropFlashLoanReceiver is IFlashLoanReceiver, ERC721Holder, ERC1155Holder {
  address public bnftRegistry;

  constructor(address bnftRegistry_) {
    bnftRegistry = bnftRegistry_;
  }

  function executeOperation(
    address nftAsset,
    uint256[] memory nftTokenIds,
    address initiator,
    address operator,
    bytes memory params
  ) public override returns (bool) {
    nftAsset;
    nftTokenIds;
    initiator;
    operator;
    params;

    // allow operator transfer borrowed nfts back to bnft
    IERC721(nftAsset).setApprovalForAll(operator, true);

    // decode parameters
    (
      uint256[] memory airdropTokenTypes,
      address[] memory airdropTokenAddresses,
      uint256[] memory airdropTokenIds,
      address airdropContract,
      bytes memory airdropParams
    ) = abi.decode(params, (uint256[], address[], uint256[], address, bytes));

    require(airdropTokenTypes.length > 0, "invalid airdrop token type");
    require(airdropTokenAddresses.length == airdropTokenTypes.length, "invalid airdrop token address length");
    require(airdropTokenIds.length == airdropTokenTypes.length, "invalid airdrop token id length");

    require(airdropContract != address(0), "invalid airdrop contract address");
    require(airdropParams.length >= 4, "invalid airdrop parameters");

    // call project aidrop contract
    Address.functionCall(airdropContract, airdropParams, "call airdrop method failed");

    // transfer airdrop tokens to borrower
    for (uint256 typeIndex = 0; typeIndex < airdropTokenTypes.length; typeIndex++) {
      require(airdropTokenAddresses[typeIndex] != address(0), "invalid airdrop token address");

      if (airdropTokenTypes[typeIndex] == 1) {
        // ERC20
        uint256 airdropBalance = IERC20(airdropTokenAddresses[typeIndex]).balanceOf(address(this));
        if (airdropBalance > 0) {
          IERC20(airdropTokenAddresses[typeIndex]).transfer(initiator, airdropBalance);
        }
      } else if (airdropTokenTypes[typeIndex] == 2) {
        // ERC721
        uint256 airdropBalance = IERC721(airdropTokenAddresses[typeIndex]).balanceOf(address(this));
        for (uint256 i = 0; i < airdropBalance; i++) {
          uint256 tokenId = IERC721Enumerable(airdropTokenAddresses[typeIndex]).tokenOfOwnerByIndex(address(this), 0);
          IERC721Enumerable(airdropTokenAddresses[typeIndex]).safeTransferFrom(address(this), initiator, tokenId);
        }
      } else if (airdropTokenTypes[typeIndex] == 3) {
        // ERC115
        uint256 airdropBalance = IERC1155(airdropTokenAddresses[typeIndex]).balanceOf(
          address(this),
          airdropTokenIds[typeIndex]
        );
        IERC1155(airdropTokenAddresses[typeIndex]).safeTransferFrom(
          address(this),
          initiator,
          airdropTokenIds[typeIndex],
          airdropBalance,
          new bytes(0)
        );
      }
    }

    return true;
  }
}
