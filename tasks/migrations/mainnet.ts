import { task } from "hardhat/config";
import { checkVerification } from "../../helpers/etherscan-verification";
import { ConfigNames, } from "../../helpers/configuration";
import { printContracts } from "../../helpers/misc-utils";
import { getDeploySigner } from "../../helpers/contracts-getters";
import { formatEther } from "@ethersproject/units";
import { loadPoolConfig } from "../../helpers/configuration";

task("bend:mainnet", "Deploy full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addFlag("skipRegistry", "Skip addresses provider registration at Addresses Provider Registry")
  .setAction(async ({ verify, skipRegistry }, DRE) => {
    const POOL_NAME = ConfigNames.Bend;
    await DRE.run("set-DRE");
    const poolConfig = loadPoolConfig(POOL_NAME);

    const deployerSigner = await getDeploySigner();

    console.log(
      "Deployer:",
      await deployerSigner.getAddress(),
      "Balance:",
      formatEther(await deployerSigner.getBalance())
    );

    // Prevent loss of gas verifying all the needed ENVs for Etherscan verification
    if (verify) {
      checkVerification();
    }

    console.log("\n\nMigration started");

    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nDeploy proxy admin");
    await DRE.run("full:deploy-proxy-admin", { pool: POOL_NAME });

    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nDeploy bnft registry");
    await DRE.run("full:deploy-bnft-registry", { pool: POOL_NAME });

    console.log("\n\nDeploy bnft tokens");
    await DRE.run("full:deploy-bnft-tokens", { pool: POOL_NAME });

    if (verify) {
      printContracts();

      console.log("\n\nVeryfing general contracts");
      await DRE.run("verify:general", { all: true, pool: POOL_NAME });
    }

    console.log("\n\nFinished migrations");
    printContracts();
  });
