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

    await expect(bBAYC.connect(user5.signer).setDelegateCashForToken([cachedTokenId1], true)).to.be.revertedWith(
      "BNFT: caller is not owner"
    );
  });

  it("Successful to set delegate cash for tokens", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];

    await waitForTx(await bBAYC.connect(user0.signer).setDelegateCashForToken([cachedTokenId1, cachedTokenId2], true));

    const check1 = await mockDelegateCash.checkDelegateForToken(
      user0.address,
      bBAYC.address,
      await bBAYC.underlyingAsset(),
      cachedTokenId1
    );
    const check2 = await mockDelegateCash.checkDelegateForToken(
      user0.address,
      bBAYC.address,
      await bBAYC.underlyingAsset(),
      cachedTokenId2
    );

    expect(check1).to.be.equal(true);
    expect(check2).to.be.equal(true);
  });

  it("Successful to unset delegate cash for tokens", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];

    await waitForTx(await bBAYC.connect(user0.signer).setDelegateCashForToken([cachedTokenId1], false));

    const check1 = await mockDelegateCash.checkDelegateForToken(
      user0.address,
      bBAYC.address,
      await bBAYC.underlyingAsset(),
      cachedTokenId1
    );
    const check2 = await mockDelegateCash.checkDelegateForToken(
      user0.address,
      bBAYC.address,
      await bBAYC.underlyingAsset(),
      cachedTokenId2
    );

    expect(check1).to.be.equal(false);
    expect(check2).to.be.equal(true);
  });

  it("Successful to remove delegate cash when burn", async () => {
    const { bBAYC, users } = testEnv;
    const user0 = users[0];

    await waitForTx(await mockMinterInstance.connect(user0.signer).burn(cachedTokenId2));

    const check1 = await mockDelegateCash.checkDelegateForToken(
      user0.address,
      bBAYC.address,
      await bBAYC.underlyingAsset(),
      cachedTokenId1
    );
    const check2 = await mockDelegateCash.checkDelegateForToken(
      user0.address,
      bBAYC.address,
      await bBAYC.underlyingAsset(),
      cachedTokenId1
    );

    expect(check1).to.be.equal(false);
    expect(check2).to.be.equal(false);
  });
});
