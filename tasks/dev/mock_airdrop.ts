import { task } from "hardhat/config";
import { deployMockAirdrop } from "../../helpers/contracts-deployments";
import { getBNFTRegistryProxy, getMockAirdrop } from "../../helpers/contracts-getters";
import { waitForTx } from "../../helpers/misc-utils";
import { eNetwork } from "../../helpers/types";

task("dev:deploy-mock-airdrops", "Deploy mock airdrop for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }
    const registry = await getBNFTRegistryProxy();
    console.log("BNFTRegistry:", registry.address);
    await deployMockAirdrop([registry.address], verify);
  });

task("dev:apply-airdrop", "Doing apply style airdrop for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("id", "ID of ERC721 token")
  .setAction(async ({ token, id }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }
    const mockAirdrop = await getMockAirdrop();
    await waitForTx(await mockAirdrop.applyAirdrop(token, id));
    console.log("OK");
  });

task("dev:snapshot-airdrop", "Doing snpashot style airdrop for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("id", "ID of ERC721 token")
  .setAction(async ({ token, id }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }
    const mockAirdrop = await getMockAirdrop();
    await waitForTx(await mockAirdrop.snapshotAirdrop(token, id));
    console.log("OK");
  });
