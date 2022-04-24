import { expect } from "chai";
import { makeSuite, TestEnv } from "./helpers/make-suite";
import { getDeploySigner } from "../helpers/contracts-getters";
import { BNFT, BNFTFactory } from "../types";
import { ZERO_ADDRESS } from "../helpers/constants";

makeSuite("Upgradeability", (testEnv: TestEnv) => {
  let newBNFTInstance1: BNFT;
  let newBNFTInstance2: BNFT;
  let newBNFTInstance3: BNFT;

  before("deploying instances", async () => {
    newBNFTInstance1 = await new BNFTFactory(await getDeploySigner()).deploy();
    newBNFTInstance2 = await new BNFTFactory(await getDeploySigner()).deploy();
    newBNFTInstance3 = await new BNFTFactory(await getDeploySigner()).deploy();
  });

  it("Tries to upgrade the BAYC implementation with a different address than the owner", async () => {
    const { bnftRegistry, bayc, users } = testEnv;

    await expect(
      bnftRegistry.connect(users[1].signer).upgradeBNFTWithImpl(bayc.address, newBNFTInstance1.address, [])
    ).to.be.revertedWith("");
  });

  it("Upgrades the BAYC implementation ", async () => {
    const { bnftRegistry, bayc, users } = testEnv;

    await bnftRegistry.upgradeBNFTWithImpl(bayc.address, newBNFTInstance1.address, []);

    const { bNftImpl } = await bnftRegistry.getBNFTAddresses(bayc.address);
    expect(bNftImpl).to.be.eq(newBNFTInstance1.address, "Invalid implementation");
  });

  it("Batch Upgrades some BNFT implementation ", async () => {
    const { bnftRegistry, bayc, users } = testEnv;

    await bnftRegistry.setBNFTGenericImpl(newBNFTInstance2.address);
    await bnftRegistry.batchUpgradeBNFT([bayc.address]);

    const { bNftImpl } = await bnftRegistry.getBNFTAddresses(bayc.address);
    expect(bNftImpl).to.be.eq(newBNFTInstance2.address, "Invalid implementation");
  });

  it("Batch Upgrades all BNFT implementation ", async () => {
    const { bnftRegistry, bayc, users } = testEnv;

    await bnftRegistry.setBNFTGenericImpl(newBNFTInstance3.address);
    await bnftRegistry.batchUpgradeAllBNFT();

    const { bNftImpl } = await bnftRegistry.getBNFTAddresses(bayc.address);
    expect(bNftImpl).to.be.eq(newBNFTInstance3.address, "Invalid implementation");
  });
});
