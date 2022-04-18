import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import {
  deployAirdropFlashLoanReceiver,
  deployMockAirdrop,
  deployMockBNFTMinter,
  deployMockFlashLoanReceiver,
} from "../helpers/contracts-deployments";
import { AirdropFlashLoanReceiver, MockAirdropProject } from "../types";
import { getMintableERC1155, getMintableERC20, getMintableERC721 } from "../helpers/contracts-getters";
import { ethers } from "ethers";
import { waitForTx } from "../helpers/misc-utils";

const { expect } = require("chai");

makeSuite("Airdrop: FlashLoan", (testEnv: TestEnv) => {
  let _airdropFlashLoanReceiver = {} as AirdropFlashLoanReceiver;
  let _mockAirdropProject = {} as MockAirdropProject;
  let _mockBNFTMinter = {} as MockBNFTMinter;

  before(async () => {
    const { bayc, bBAYC, bnftRegistry } = testEnv;

    _airdropFlashLoanReceiver = await deployAirdropFlashLoanReceiver([bnftRegistry.address]);
    _mockAirdropProject = await deployMockAirdrop([bnftRegistry.address]);
    _mockBNFTMinter = await deployMockBNFTMinter([bayc.address, bBAYC.address]);
  });

  afterEach(async () => {});

  it("Apply airdrop using flashLoan", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner = users[0];

    await waitForTx(await bayc.setApprovalForAll(_mockBNFTMinter.address, true));

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId));

    await waitForTx(await _mockBNFTMinter.mint(nftOwner.address, tokenId));

    const mockAirdropERC20Address = await _mockAirdropProject.erc20Token();
    const mockAirdropERC20Token = await getMintableERC20(mockAirdropERC20Address);
    const mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const mockAirdropERC1155Address = await _mockAirdropProject.erc1155Token();
    const mockAirdropERC1155Token = await getMintableERC1155(mockAirdropERC1155Address);

    const erc1155Id = (await _mockAirdropProject.getERC1155TokenId(tokenId)).toString();
    console.log("tokenId:", tokenId, "erc1155Id:", erc1155Id, "owner:", nftOwner.address);

    const applyAirdropEncodedData = _mockAirdropProject.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [
        [1, 2, 3],
        [mockAirdropERC20Address, mockAirdropERC721Address, mockAirdropERC1155Address],
        [0, 0, erc1155Id],
        _mockAirdropProject.address,
        applyAirdropEncodedData,
      ]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    await waitForTx(
      await bBAYC.connect(nftOwner.signer).flashLoan(_airdropFlashLoanReceiver.address, [tokenId], receiverEncodedData)
    );

    console.log("Airdrop ERC20 Balance:", await mockAirdropERC20Token.balanceOf(nftOwner.address));
    console.log("Airdrop ERC721 Balance:", await mockAirdropERC721Token.balanceOf(nftOwner.address));
    console.log("Airdrop ERC1155 Balance:", await mockAirdropERC1155Token.balanceOf(nftOwner.address, erc1155Id));

    expect(await mockAirdropERC20Token.balanceOf(nftOwner.address)).to.be.equal(await _mockAirdropProject.erc20Bonus());
    expect(await mockAirdropERC721Token.balanceOf(nftOwner.address)).to.be.equal(
      await _mockAirdropProject.erc721Bonus()
    );
    expect(await mockAirdropERC1155Token.balanceOf(nftOwner.address, erc1155Id)).to.be.equal(
      await _mockAirdropProject.erc1155Bonus()
    );
  });
});
