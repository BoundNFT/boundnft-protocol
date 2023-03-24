import { TestEnv, makeSuite } from "./helpers/make-suite";
import { deployMockBNFTMinter } from "../helpers/contracts-deployments";
import { CommonsConfig } from "../configs/commons";
import { MockBNFTMinter, MockDelegationRegistry, MockDelegationRegistryFactory } from "../types";
import { waitForTx } from "../helpers/misc-utils";
import { ZERO_ADDRESS } from "../helpers/constants";
import { getBNFT, getDeploySigner } from "../helpers/contracts-getters";

const { expect } = require("chai");

makeSuite("BNFT: Delegate Cash", (testEnv: TestEnv) => {
  let mockDelegateCash: MockDelegationRegistry;
  let mockMinterInstance: MockBNFTMinter;

  let cachedTokenId1: string;
  let cachedTokenId2: string;

  before(async () => {
    mockDelegateCash = await new MockDelegationRegistryFactory(await getDeploySigner()).deploy();
    await testEnv.bnftRegistry.connect(await getDeploySigner()).setDelegateCashContract(mockDelegateCash.address);
    mockMinterInstance = await deployMockBNFTMinter([testEnv.bayc.address, testEnv.bBAYC.address]);

    testEnv.tokenIdTracker++;
    cachedTokenId1 = testEnv.tokenIdTracker.toString();
    await testEnv.bayc.connect(testEnv.users[0].signer).mint(cachedTokenId1);

    testEnv.tokenIdTracker++;
    cachedTokenId2 = testEnv.tokenIdTracker.toString();
    await testEnv.bayc.connect(testEnv.users[0].signer).mint(cachedTokenId2);

    await testEnv.bayc.connect(testEnv.users[0].signer).setApprovalForAll(mockMinterInstance.address, true);
    await mockMinterInstance.connect(testEnv.users[0].signer).mint(testEnv.users[0].address, cachedTokenId1);
    await mockMinterInstance.connect(testEnv.users[0].signer).mint(testEnv.users[0].address, cachedTokenId2);
  });

  it("Failed to set delegate cash for tokens not owner (revert expect)", async () => {
    const { bBAYC, users } = testEnv;
    const user5 = users[5];

    await expect(
      bBAYC.connect(user5.signer)["setDelegateCashForToken(uint256[],bool)"]([cachedTokenId1], true)
    ).to.be.revertedWith("BNFT: caller is not owner");
  });

  it("Successful to set delegate cash for tokens", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];
    const user1 = users[1];

    await waitForTx(
      await bBAYC.connect(user0.signer)["setDelegateCashForToken(uint256[],bool)"]([cachedTokenId1], true)
    );
    await waitForTx(
      await bBAYC
        .connect(user0.signer)
        ["setDelegateCashForToken(address,uint256[],bool)"](user1.address, [cachedTokenId2], true)
    );
    const hasCheck1 = await bBAYC.hasDelegateCashForToken(cachedTokenId1);
    const hasCheck2 = await bBAYC.hasDelegateCashForToken(cachedTokenId2);
    expect(hasCheck1).to.be.equal(true);
    expect(hasCheck2).to.be.equal(true);

    const delegateAddr1 = await bBAYC.getDelegateCashForToken(cachedTokenId1);
    const delegateAddr2 = await bBAYC.getDelegateCashForToken(cachedTokenId2);
    expect(delegateAddr1).to.be.equal(user0.address);
    expect(delegateAddr2).to.be.equal(user1.address);
  });

  it("Failed to change delegate cash for tokens (revert expect)", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];
    const user5 = users[5];

    await expect(
      bBAYC
        .connect(user0.signer)
        ["setDelegateCashForToken(address,uint256[],bool)"](user5.address, [cachedTokenId1], true)
    ).to.be.revertedWith("BNFT: delegate not same");
  });

  it("Successful to unset delegate cash for tokens", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];
    const user1 = users[1];

    await waitForTx(
      await bBAYC.connect(user0.signer)["setDelegateCashForToken(uint256[],bool)"]([cachedTokenId1], false)
    );

    const hasCheck1 = await bBAYC.hasDelegateCashForToken(cachedTokenId1);
    const hasCheck2 = await bBAYC.hasDelegateCashForToken(cachedTokenId2);
    expect(hasCheck1).to.be.equal(false);
    expect(hasCheck2).to.be.equal(true);

    const delegateAddr1 = await bBAYC.getDelegateCashForToken(cachedTokenId1);
    const delegateAddr2 = await bBAYC.getDelegateCashForToken(cachedTokenId2);
    expect(delegateAddr1).to.be.equal(ZERO_ADDRESS);
    expect(delegateAddr2).to.be.equal(user1.address);
  });

  it("Successful to remove delegate cash when burn", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];

    await waitForTx(await mockMinterInstance.connect(user0.signer).burn(cachedTokenId2));

    const hasCheck1 = await bBAYC.hasDelegateCashForToken(cachedTokenId1);
    const hasCheck2 = await bBAYC.hasDelegateCashForToken(cachedTokenId2);
    expect(hasCheck1).to.be.equal(false);
    expect(hasCheck2).to.be.equal(false);

    const delegateAddr1 = await bBAYC.getDelegateCashForToken(cachedTokenId1);
    const delegateAddr2 = await bBAYC.getDelegateCashForToken(cachedTokenId2);
    expect(delegateAddr1).to.be.equal(ZERO_ADDRESS);
    expect(delegateAddr2).to.be.equal(ZERO_ADDRESS);
  });

  it("Successful to set delegate cash for tokens again", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];
    const user5 = users[5];

    // set to user0
    await waitForTx(
      await bBAYC
        .connect(user0.signer)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [cachedTokenId1], true)
    );

    // unset to user0
    await waitForTx(
      await bBAYC
        .connect(user0.signer)
        ["setDelegateCashForToken(address,uint256[],bool)"](user0.address, [cachedTokenId1], false)
    );

    // set to user5
    await waitForTx(
      await bBAYC
        .connect(user0.signer)
        ["setDelegateCashForToken(address,uint256[],bool)"](user5.address, [cachedTokenId1], true)
    );

    const hasCheck1 = await bBAYC.hasDelegateCashForToken(cachedTokenId1);
    expect(hasCheck1).to.be.equal(true);

    const delegateAddr1 = await bBAYC.getDelegateCashForToken(cachedTokenId1);
    expect(delegateAddr1).to.be.equal(user5.address);
  });
});
