import { TestEnv, makeSuite } from "./helpers/make-suite";
import { ZERO_ADDRESS } from "../helpers/constants";
import { deployMintableERC721, deployGenericBNFTImpl } from "../helpers/contracts-deployments";
import { getBNFT, getIErc721Detailed } from "../helpers/contracts-getters";
import { waitForTx } from "../helpers/misc-utils";

const { expect } = require("chai");

makeSuite("BoundPunkGateway", (testEnv: TestEnv) => {
  let cachedPunkIndex: number;

  before(async () => {});

  it("Deposit non exist punks (should revert)", async () => {
    const { users, punks, boundPunkGateway, bWPunks } = testEnv;
    const depositor = users[1];

    const punkIndex = testEnv.tokenIdTracker++;

    await expect(boundPunkGateway.connect(depositor.signer).depositPunk(punkIndex)).to.be.revertedWith(
      "WPG: caller is not owner in Punks"
    );
  });

  it("Deposit wrong owner punks (should revert)", async () => {
    const { users, punks, boundPunkGateway, bWPunks } = testEnv;
    const depositor = users[1];
    const hacker = users[2];

    const punkIndex = testEnv.tokenIdTracker++;

    await waitForTx(await punks.connect(depositor.signer).getPunk(punkIndex));
    await waitForTx(
      await punks.connect(depositor.signer).offerPunkForSaleToAddress(punkIndex, 0, boundPunkGateway.address)
    );

    await expect(boundPunkGateway.connect(hacker.signer).depositPunk(punkIndex)).to.be.revertedWith(
      "WPG: caller is not owner in Punks"
    );
  });

  it("Deposit correct owner punks", async () => {
    const { users, punks, boundPunkGateway, bWPunks } = testEnv;
    const depositor = users[1];

    const punkIndex = testEnv.tokenIdTracker++;

    await waitForTx(await punks.connect(depositor.signer).getPunk(punkIndex));
    await waitForTx(
      await punks.connect(depositor.signer).offerPunkForSaleToAddress(punkIndex, 0, boundPunkGateway.address)
    );

    await waitForTx(await boundPunkGateway.connect(depositor.signer).depositPunk(punkIndex));

    const bnftOwner = await bWPunks.ownerOf(punkIndex);
    await expect(bnftOwner).to.be.eq(depositor.address);

    cachedPunkIndex = punkIndex;
  });

  it("Withdraw non exist punks (should revert)", async () => {
    const { users, punks, boundPunkGateway, bWPunks } = testEnv;
    const depositor = users[1];
    const hacker = users[2];

    const punkIndex = testEnv.tokenIdTracker++;

    await expect(boundPunkGateway.connect(depositor.signer).withdrawPunk(punkIndex)).to.be.revertedWith(
      "ERC721: owner query for nonexistent token"
    );
  });

  it("Withdraw wrong punks (should revert)", async () => {
    const { users, punks, boundPunkGateway, bWPunks } = testEnv;
    const depositor = users[1];
    const hacker = users[2];

    await expect(boundPunkGateway.connect(hacker.signer).withdrawPunk(cachedPunkIndex)).to.be.revertedWith(
      "WPG: caller is not owner in bnftWPunks"
    );
  });

  it("Withdraw correct punks", async () => {
    const { users, punks, boundPunkGateway, bWPunks } = testEnv;
    const depositor = users[1];
    const hacker = users[2];

    await waitForTx(await boundPunkGateway.connect(depositor.signer).withdrawPunk(cachedPunkIndex));

    const punkOwner = await punks.punkIndexToAddress(cachedPunkIndex);
    await expect(punkOwner).to.be.eq(depositor.address);
  });
});
