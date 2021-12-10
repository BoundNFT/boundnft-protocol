import { task } from "hardhat/config";
import { checkVerification } from "../../helpers/etherscan-verification";
import { ConfigNames } from "../../helpers/configuration";
import { printContracts } from "../../helpers/misc-utils";

task("bend:dev", "Deploy development enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    const POOL_NAME = ConfigNames.Bend;

    await localBRE.run("set-DRE");

    // Prevent loss of gas verifying all the needed ENVs for Etherscan verification
    if (verify) {
      checkVerification();
    }

    console.log("\n\nMigration started");

    console.log("\n\nDeploy mock nfts");
    await localBRE.run("dev:deploy-mock-nfts", { verify });

    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nDeploy proxy admin");
    await localBRE.run("full:deploy-proxy-admin", { verify, pool: POOL_NAME });

    //////////////////////////////////////////////////////////////////////////
    console.log("\n\nDeploy bnft registry");
    await localBRE.run("dev:deploy-bnft-registry", { verify, pool: POOL_NAME });

    console.log("\n\nDeploy bnft tokens");
    await localBRE.run("dev:deploy-bnft-tokens", { verify, pool: POOL_NAME });

    console.log("\n\nFinished migration");
    printContracts();
  });
