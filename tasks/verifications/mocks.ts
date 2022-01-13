import { task } from "hardhat/config";
import { loadPoolConfig, ConfigNames } from "../../helpers/configuration";
import { getAllMockedNfts, getBNFTRegistryProxy, getMockAirdrop } from "../../helpers/contracts-getters";
import { verifyContract, getParamPerNetwork } from "../../helpers/contracts-helpers";
import { eContractid, eNetwork, ICommonConfiguration } from "../../helpers/types";

task("verify:mock-nfts", "Verify mock nft contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ pool }, localDRE) => {
    await localDRE.run("set-DRE");
    const network = localDRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }
    const poolConfig = loadPoolConfig(pool);

    const allMockNfts = await getAllMockedNfts();
    console.log("allMockNfts:", allMockNfts);

    for (const symbol of Object.keys(allMockNfts)) {
      const mockNftToken = allMockNfts[symbol];
      console.log("\n- Verifying Mocked ${symbol}...\n");
      await verifyContract(eContractid.MintableERC721, mockNftToken, [
        await mockNftToken.name(),
        await mockNftToken.symbol(),
      ]);
    }

    console.log("Finished verifications.");
  });

task("verify:mock-airdrops", "Verify mock airdrop contracts at Etherscan").setAction(async ({}, localDRE) => {
  await localDRE.run("set-DRE");
  const network = localDRE.network.name as eNetwork;
  if (network.includes("main")) {
    throw new Error("Mocks not used at mainnet configuration.");
  }

  const registry = await getBNFTRegistryProxy();

  const mockAirdrop = await getMockAirdrop();
  await verifyContract(eContractid.MockAirdrop, mockAirdrop, [registry.address]);

  console.log("Finished verifications.");
});
