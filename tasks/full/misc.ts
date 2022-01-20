import { task } from "hardhat/config";
import { ConfigNames } from "../../helpers/configuration";
import { deployAirdropFlashLoanReceiver } from "../../helpers/contracts-deployments";
import { getBNFTRegistryProxy } from "../../helpers/contracts-getters";
import { eNetwork } from "../../helpers/types";

task("full:deploy-airdrop-flashloan", "Deploy airdrop flashloan receiver for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    const registry = await getBNFTRegistryProxy();
    console.log("BNFTRegistry:", registry.address);
    const airdropFlashloan = await deployAirdropFlashLoanReceiver([registry.address], verify);
    console.log("AirdropFlashLoanReceiver:", airdropFlashloan.address);
  });
