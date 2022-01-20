import { makeSuite } from "./helpers/make-suite";

import { getNowTimeInMilliSeconds, waitForTx } from "../helpers/misc-utils";
import { getBNFT, getFirstSigner } from "../helpers/contracts-getters";
import { MintableERC721Factory } from "../types";
import { deployMockBNFTMinter } from "../helpers/contracts-deployments";

const { expect } = require("chai");

makeSuite("Subgraph tests", async (testEnv) => {
  it("bayc-mint-burn", async () => {
    const { users, bnftRegistry, bayc, bBAYC } = testEnv;
    const user0 = users[0];
    const user1 = users[1];

    const mockMinter = await deployMockBNFTMinter([bayc.address, bBAYC.address]);

    await waitForTx(await bayc.connect(user0.signer).setApprovalForAll(mockMinter.address, true));

    {
      const tokenId1 = 2001;

      await waitForTx(await bayc.connect(user0.signer).mint(tokenId1));

      await waitForTx(await mockMinter.connect(user0.signer).mint(user0.address, tokenId1));

      await waitForTx(await mockMinter.connect(user0.signer).burn(tokenId1));
    }

    {
      const tokenId2 = 2002;
      await waitForTx(await bayc.connect(user0.signer).mint(tokenId2));

      await waitForTx(await mockMinter.connect(user0.signer).mint(user0.address, tokenId2));
    }
  });

  it("new-bnft-mint-burn", async () => {
    const { users, bnftRegistry, bBAYC } = testEnv;
    const user0 = users[0];
    const user1 = users[1];

    const latestTime = await getNowTimeInMilliSeconds();
    const tokenName = "Subgraph Test " + latestTime.toString();
    const tokenSymbol = "ST" + latestTime.toString();
    const stToken = await new MintableERC721Factory(await getFirstSigner()).deploy(tokenName, tokenSymbol);

    console.log("stToken:", await stToken.name(), await stToken.symbol());

    await waitForTx(await bnftRegistry.createBNFT(stToken.address));

    const { bNftProxy } = await bnftRegistry.getBNFTAddresses(stToken.address);
    const bnftStToken = await getBNFT(bNftProxy);

    console.log("bnftStToken:", await bnftStToken.name(), await bnftStToken.symbol());

    const mockMinter = await deployMockBNFTMinter([stToken.address, bNftProxy]);

    await waitForTx(await stToken.connect(user0.signer).setApprovalForAll(mockMinter.address, true));

    {
      const tokenId1 = 2001;

      await waitForTx(await stToken.connect(user0.signer).mint(tokenId1));

      await waitForTx(await mockMinter.connect(user0.signer).mint(user0.address, tokenId1));

      await waitForTx(await mockMinter.connect(user0.signer).burn(tokenId1));
    }

    {
      const tokenId2 = 2002;
      await waitForTx(await stToken.connect(user0.signer).mint(tokenId2));

      await waitForTx(await mockMinter.connect(user0.signer).mint(user0.address, tokenId2));
    }
  });
});
