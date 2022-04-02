import { TestEnv, makeSuite } from "./helpers/make-suite";

const { expect } = require("chai");

makeSuite("BNFT: EOA", (testEnv: TestEnv) => {
  let cachedTokenId: string;

  before(async () => {});

  it("Prepare token", async () => {
    const { bayc, bBAYC, users } = testEnv;

    testEnv.tokenIdTracker++;
    const tokenId1 = testEnv.tokenIdTracker.toString();
    await bayc.connect(users[0].signer).mint(tokenId1);
    await bayc.connect(users[0].signer).setApprovalForAll(bBAYC.address, true);

    testEnv.tokenIdTracker++;
    const tokenId2 = testEnv.tokenIdTracker.toString();
    await bayc.connect(users[1].signer).mint(tokenId2);
    await bayc.connect(users[1].signer).setApprovalForAll(bBAYC.address, true);

    cachedTokenId = tokenId1;
  });

  it("Check to must be caller", async () => {
    const { bayc, bBAYC, users } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    await expect(bBAYC.connect(users[0].signer).mint(users[1].address, tokenId)).to.be.revertedWith(
      "BNFT: caller is not to"
    );
  });

  it("Check mint other owner's token", async () => {
    const { bayc, bBAYC, users } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    await expect(bBAYC.connect(users[1].signer).mint(users[1].address, tokenId)).to.be.revertedWith(
      "BNFT: caller is not owner"
    );
  });

  it("Check burn non-exist token", async () => {
    const { bayc, bBAYC, users } = testEnv;

    const tokenId = testEnv.tokenIdTracker++;

    await expect(bBAYC.burn(tokenId)).to.be.revertedWith("BNFT: nonexist token");
  });

  it("Check mint correctly", async () => {
    const { bayc, bBAYC, users } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    await bayc.connect(users[0].signer).setApprovalForAll(bBAYC.address, true);
    await bBAYC.connect(users[0].signer).mint(users[0].address, tokenId);

    const minter = await bBAYC.minterOf(tokenId);
    expect(minter).to.be.equal(users[0].address);

    const tokenUri = await bayc.tokenURI(tokenId);
    const tokenUriB = await bBAYC.tokenURI(tokenId);
    expect(tokenUriB).to.be.equal(tokenUri);
  });

  it("Check burn caller must be minter", async () => {
    const { bayc, bBAYC, users } = testEnv;

    expect(cachedTokenId, "previous test case is faild").to.not.be.undefined;
    const tokenId = cachedTokenId;

    await expect(bBAYC.connect(users[1].signer).burn(tokenId)).to.be.revertedWith("BNFT: caller is not minter");
  });
});
