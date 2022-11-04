import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { eNetwork } from "../../helpers/types";
import { deployBNFTRegistry, deployGenericBNFTImpl } from "../../helpers/contracts-deployments";

task("dev:deploy-new-implementation", "Deploy new implementation")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("contract", "Contract name")
  .setAction(async ({ verify, pool, contract }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");

    const network = DRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    if (contract == "BNFTRegistry") {
      const newImpl = await deployBNFTRegistry(verify);
      console.log("BNFTRegistry implementation address:", newImpl.address);
    }

    if (contract == "BNFT") {
      const newImpl = await deployGenericBNFTImpl(verify);
      console.log("BNFT generic implementation address:", newImpl.address);
    }
  });
