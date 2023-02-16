import { TestEnv, makeSuite } from "./helpers/make-suite";
import { deployMockBNFTMinter } from "../helpers/contracts-deployments";
import { CommonsConfig } from "../configs/commons";
import { BNFTFactory, BNFTRegistryFactory, MintableERC721Factory, MockBNFTMinter } from "../types";
import { waitForTx } from "../helpers/misc-utils";
import { ZERO_ADDRESS } from "../helpers/constants";
import { getBNFT, getDeploySigner } from "../helpers/contracts-getters";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";

const { expect } = require("chai");

makeSuite("BNFT: Contract Address", (testEnv: TestEnv) => {
  let mockMinterInstance1: MockBNFTMinter;
  let mockMinterInstance2: MockBNFTMinter;
  let cachedTokenId: string;

  before(async () => {
    mockMinterInstance1 = await deployMockBNFTMinter([testEnv.bayc.address, testEnv.bBAYC.address]);
    mockMinterInstance2 = await deployMockBNFTMinter([testEnv.bayc.address, testEnv.bBAYC.address]);
  });

  it("Check basic parameters", async () => {
    const { bayc, bBAYC, users } = testEnv;

    const baycName = await bayc.name();
    const baycSymbol = await bayc.symbol();

    const bBAYCName = await bBAYC.name();
    expect(bBAYCName).to.be.equal(CommonsConfig.BNftNamePrefix + " " + baycSymbol);

    const bBAYCSymbol = await bBAYC.symbol();
    expect(bBAYCSymbol).to.be.equal(CommonsConfig.BNftSymbolPrefix + baycSymbol);

    const bBontractURI = await bBAYC.contractURI();
    console.log("contractURI:", bBontractURI);
    expect(bBontractURI).to.be.contains(bBAYC.address.toLowerCase());

    const nftAsset = await bBAYC.underlyingAsset();
    expect(nftAsset).to.be.equal(bayc.address);

    testEnv.tokenIdTracker++;
    const tokenId = testEnv.tokenIdTracker.toString();
    await bayc.connect(users[0].signer).mint(tokenId);
    await bayc.connect(users[0].signer).setApprovalForAll(mockMinterInstance1.address, true);

    cachedTokenId = tokenId;
  });

  it("Check mint other owner's token", async () => {
    const { bayc, bBAYC, users } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    await bayc.connect(users[0].signer).setApprovalForAll(mockMinterInstance2.address, true);

    await expect(mockMinterInstance2.mint(users[0].address, tokenId)).to.be.revertedWith(
      "ERC721: transfer from incorrect owner"
    );
  });

  it("Check burn non-exist token", async () => {
    const { bayc, bBAYC, users } = testEnv;

    const tokenId = testEnv.tokenIdTracker++;

    await expect(mockMinterInstance1.burn(tokenId)).to.be.revertedWith("BNFT: nonexist token");
  });

  it("Check mint correctly", async () => {
    const { bayc, bBAYC, users } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    await bayc.connect(users[0].signer).setApprovalForAll(mockMinterInstance1.address, true);
    await mockMinterInstance1.connect(users[0].signer).mint(users[0].address, tokenId);

    const minter = await bBAYC.minterOf(tokenId);
    expect(minter).to.be.equal(mockMinterInstance1.address);

    const tokenUri = await bayc.tokenURI(tokenId);
    const tokenUriB = await bBAYC.tokenURI(tokenId);
    expect(tokenUriB).to.be.equal(tokenUri);
  });

  it("Check burn caller must be minter", async () => {
    const { bayc, bBAYC, users } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    await expect(mockMinterInstance2.burn(tokenId)).to.be.revertedWith("BNFT: caller is not minter");
  });

  it("Check token is non-transfer", async () => {
    const { bayc, bBAYC, users, bnftRegistry } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    // check non-approve
    await expect(bBAYC.connect(users[0].signer).approve(bnftRegistry.address, tokenId)).to.be.revertedWith(
      "APPROVAL_NOT_SUPPORTED"
    );
    await expect(bBAYC.connect(users[0].signer).setApprovalForAll(bnftRegistry.address, true)).to.be.revertedWith(
      "APPROVAL_NOT_SUPPORTED"
    );

    // check non-transfer
    await expect(
      bBAYC.connect(users[0].signer).transferFrom(users[0].address, users[1].address, tokenId)
    ).to.be.revertedWith("TRANSFER_NOT_SUPPORTED");

    //safeTransferFrom is a overloaded function.
    //In ethers, the syntax to call an overloaded contract function is different from the non-overloaded function.
    await expect(
      bBAYC
        .connect(users[0].signer)
        ["safeTransferFrom(address,address,uint256)"](users[0].address, users[1].address, tokenId)
    ).to.be.revertedWith("TRANSFER_NOT_SUPPORTED");

    await expect(
      bBAYC
        .connect(users[0].signer)
        ["safeTransferFrom(address,address,uint256,bytes)"](users[0].address, users[1].address, tokenId, "0x1234")
    ).to.be.revertedWith("TRANSFER_NOT_SUPPORTED");
  });

  it("Manage contract owner", async () => {
    const { bnftRegistry, users } = testEnv;
    const newOwnerUser = users[5];

    const testErc721 = await new MintableERC721Factory(await getDeploySigner()).deploy("TEST", "TEST");
    await waitForTx(await bnftRegistry.createBNFT(testErc721.address));
    const testBnftAddrs = await bnftRegistry.getBNFTAddresses(testErc721.address);
    const testBnft = await getBNFT(testBnftAddrs.bNftProxy);

    await waitForTx(await testBnft.transferOwnership(newOwnerUser.address));
    const newOwnerAddr = await testBnft.owner();
    expect(newOwnerAddr).to.equal(newOwnerUser.address);

    await waitForTx(await testBnft.connect(newOwnerUser.signer).renounceOwnership());
    const newOwnerAddr2 = await testBnft.owner();
    expect(newOwnerAddr2).to.equal(ZERO_ADDRESS);
  });

  it("Manage bnft registry without permission (revert expect)", async () => {
    const { bBAYC, users } = testEnv;
    const user5 = users[5];

    const testRegistry = await new BNFTRegistryFactory(await getDeploySigner()).deploy();

    await expect(bBAYC.connect(user5.signer).setBNFTRegistry(testRegistry.address)).to.be.revertedWith(
      "BNFT: caller is not the owner"
    );
  });

  it("Manage bnft registry", async () => {
    const { bBAYC, users } = testEnv;

    const curOwnerAddr = await bBAYC.owner();
    const curOwnerSinger = await getEthersSignerByAddress(curOwnerAddr);

    const oldRegistryAddr = await bBAYC.getBNFTRegistry();

    const testRegistry = await new BNFTRegistryFactory(await getDeploySigner()).deploy();

    await waitForTx(await bBAYC.connect(curOwnerSinger).setBNFTRegistry(testRegistry.address));
    const newRegistryAddr = await bBAYC.getBNFTRegistry();
    expect(newRegistryAddr).to.equal(testRegistry.address);

    await waitForTx(await bBAYC.connect(curOwnerSinger).setBNFTRegistry(oldRegistryAddr));
  });
});
