import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import { deployMockAirdrop, deployMockBNFTMinter } from "../helpers/contracts-deployments";
import { MockAirdropProject } from "../types";
import { getMintableERC1155, getMintableERC20, getMintableERC721 } from "../helpers/contracts-getters";
import { waitForTx } from "../helpers/misc-utils";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";

const { expect } = require("chai");

makeSuite("BNFT: Airdrop Execute", (testEnv: TestEnv) => {
  let _mockAirdropProject = {} as MockAirdropProject;
  let _mockBNFTMinter = {} as MockBNFTMinter;

  before(async () => {
    const { bayc, bBAYC, bnftRegistry } = testEnv;

    _mockAirdropProject = await deployMockAirdrop([bnftRegistry.address]);
    _mockBNFTMinter = await deployMockBNFTMinter([bayc.address, bBAYC.address]);
  });

  afterEach(async () => {});

  it("Execute airdrop using invalid contract (revert expect)", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner1 = users[1];
    const nftOwner2 = users[2];

    await waitForTx(await bayc.connect(nftOwner1.signer).setApprovalForAll(_mockBNFTMinter.address, true));
    await waitForTx(await bayc.connect(nftOwner2.signer).setApprovalForAll(_mockBNFTMinter.address, true));

    const claimAdminAddr = await bBAYC.claimAdmin();
    const claimAdminSigner = await getEthersSignerByAddress(claimAdminAddr);

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.connect(nftOwner1.signer).mint(tokenId));
    await waitForTx(await _mockBNFTMinter.connect(nftOwner1.signer).mint(nftOwner1.address, tokenId));

    const applyAirdropEncodedData = bayc.interface.encodeFunctionData("transferFrom", [
      nftOwner1.address,
      nftOwner2.address,
      tokenId,
    ]);

    await expect(
      bBAYC.connect(claimAdminSigner).executeAirdrop(bayc.address, applyAirdropEncodedData)
    ).to.be.revertedWith("BNFT: airdrop can not be underlying asset");

    await expect(
      bBAYC.connect(claimAdminSigner).executeAirdrop(bBAYC.address, applyAirdropEncodedData)
    ).to.be.revertedWith("BNFT: airdrop can not be self address");
  });

  it("Execute airdrop using correct contract", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner = users[0];
    const claimAdminAddr = await bBAYC.claimAdmin();
    const claimAdminSigner = await getEthersSignerByAddress(claimAdminAddr);

    await waitForTx(await bayc.connect(nftOwner.signer).setApprovalForAll(_mockBNFTMinter.address, true));

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.connect(nftOwner.signer).mint(tokenId));

    await waitForTx(await _mockBNFTMinter.connect(nftOwner.signer).mint(nftOwner.address, tokenId));

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

    await waitForTx(
      await bBAYC.connect(claimAdminSigner).executeAirdrop(_mockAirdropProject.address, applyAirdropEncodedData)
    );

    console.log("Airdrop ERC20 Balance:", await mockAirdropERC20Token.balanceOf(bBAYC.address));
    console.log("Airdrop ERC721 Balance:", await mockAirdropERC721Token.balanceOf(bBAYC.address));
    console.log("Airdrop ERC1155 Balance:", await mockAirdropERC1155Token.balanceOf(bBAYC.address, erc1155Id));

    expect(await mockAirdropERC20Token.balanceOf(bBAYC.address)).to.be.equal(await _mockAirdropProject.erc20Bonus());
    expect(await mockAirdropERC721Token.balanceOf(bBAYC.address)).to.be.equal(await _mockAirdropProject.erc721Bonus());
    expect(await mockAirdropERC1155Token.balanceOf(bBAYC.address, erc1155Id)).to.be.equal(
      await _mockAirdropProject.erc1155Bonus()
    );
  });
});
