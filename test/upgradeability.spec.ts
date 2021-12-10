import { expect } from "chai";
import { makeSuite, TestEnv } from "./helpers/make-suite";
import { getFirstSigner } from "../helpers/contracts-getters";
import { BNFT, BNFTFactory } from "../types";

makeSuite("Upgradeability", (testEnv: TestEnv) => {
  let newBNFTInstance: BNFT;

  before("deploying instances", async () => {
    newBNFTInstance = await new BNFTFactory(await getFirstSigner()).deploy();
  });

  it("Tries to upgrade the BAYC implementation with a different address than the owner", async () => {
    const { bnftRegistry, bayc, users } = testEnv;

    await expect(bnftRegistry.connect(users[1].signer).upgradeBNFTWithImpl(bayc.address, newBNFTInstance.address, [])).to.be.revertedWith(
      ""
    );
  });

  it("Upgrades the BAYC implementation ", async () => {
    const { bnftRegistry, bayc, users } = testEnv;

    await bnftRegistry.upgradeBNFTWithImpl(bayc.address, newBNFTInstance.address, []);

    const { bNftImpl } = await bnftRegistry.getBNFTAddresses(bayc.address);
    expect(bNftImpl).to.be.eq(newBNFTInstance.address, "Invalid implementation");
  });
});
