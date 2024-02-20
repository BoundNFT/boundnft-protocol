import { deployMockBNFTMinter } from "../helpers/contracts-deployments";
import { getBNFT } from "../helpers/contracts-getters";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";
import { waitForTx } from "../helpers/misc-utils";
import { BNFT, MockBNFTMinter, MockMoonbirds, MockMoonbirdsFactory } from "../types";
import { TestEnv, makeSuite } from "./helpers/make-suite";

const { expect } = require("chai");

makeSuite("BNFT: Moonbirds APIs", (testEnv: TestEnv) => {
  let _mockMoonbirds = {} as MockMoonbirds;
  let _mockBnftMoonbirds = {} as BNFT;
  let _mockMBirdsMinter = {} as MockBNFTMinter;
  let _mockBaycMinter = {} as MockBNFTMinter;

  before(async () => {
    _mockMoonbirds = await new MockMoonbirdsFactory(testEnv.deployer.signer).deploy("MoonBirds", "MBIRD");

    await waitForTx(await testEnv.bnftRegistry.createBNFT(_mockMoonbirds.address));
    const moonbirdsAddrs = await testEnv.bnftRegistry.getBNFTAddresses(_mockMoonbirds.address);
    _mockBnftMoonbirds = await getBNFT(moonbirdsAddrs.bNftProxy);

    _mockMBirdsMinter = await deployMockBNFTMinter([_mockMoonbirds.address, _mockBnftMoonbirds.address]);
    _mockBaycMinter = await deployMockBNFTMinter([testEnv.bayc.address, testEnv.bBAYC.address]);
  });

  it("Toggle nesting using invalid contract (revert expect)", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner1 = users[1];

    const bnftOwnerAddr = await _mockBnftMoonbirds.owner();
    const bnftOwnerSigner = await getEthersSignerByAddress(bnftOwnerAddr);

    await waitForTx(await bayc.connect(nftOwner1.signer).setApprovalForAll(_mockBaycMinter.address, true));

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.connect(nftOwner1.signer).mint(tokenId));
    await waitForTx(await _mockBaycMinter.connect(nftOwner1.signer).mint(nftOwner1.address, tokenId));

    await expect(bBAYC.connect(bnftOwnerSigner).toggleMoonirdsNesting([tokenId])).to.be.revertedWith("");
  });

  it("Toggle nesting using correct contract", async () => {
    const { users } = testEnv;
    const nftOwner1 = users[1];

    const bnftOwnerAddr = await _mockBnftMoonbirds.owner();
    const bnftOwnerSigner = await getEthersSignerByAddress(bnftOwnerAddr);

    await waitForTx(await _mockMoonbirds.connect(nftOwner1.signer).setApprovalForAll(_mockMBirdsMinter.address, true));

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await _mockMoonbirds.connect(nftOwner1.signer).mint(tokenId));
    await waitForTx(await _mockMBirdsMinter.connect(nftOwner1.signer).mint(nftOwner1.address, tokenId));

    await waitForTx(await _mockBnftMoonbirds.connect(bnftOwnerSigner).toggleMoonirdsNesting([tokenId]));
    const nestRet1 = await _mockMoonbirds.nestingPeriod(tokenId);
    expect(nestRet1.nesting).to.be.equal(true);

    await waitForTx(await _mockBnftMoonbirds.connect(bnftOwnerSigner).toggleMoonirdsNesting([tokenId]));
    const nestRet2 = await _mockMoonbirds.nestingPeriod(tokenId);
    expect(nestRet2.nesting).to.be.equal(false);
  });
});
