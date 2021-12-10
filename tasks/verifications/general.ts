import { task } from "hardhat/config";
import { loadPoolConfig, ConfigNames } from "../../helpers/configuration";
import {
  getBNFTUpgradeableProxy, getBNFT, getBNFTRegistryImpl, getBNFTRegistryProxy,
} from "../../helpers/contracts-getters";
import { verifyContract, getParamPerNetwork } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress } from "../../helpers/misc-utils";
import { eContractid, eNetwork, ICommonConfiguration } from "../../helpers/types";

task("verify:general", "Verify general contracts at Etherscan")
  .addFlag("all", "Verify all contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ all, pool }, localDRE) => {
    await localDRE.run("set-DRE");
    const network = localDRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const bnftRegistryProxy = await getBNFTRegistryProxy();

    const bnftRegistryImpl = await getBNFTRegistryImpl();
    const bnftGenericImpl = await getBNFT();

    if (all) {
      // BNFT Registry implementation
      console.log("\n- Verifying BNFT Registry Implementation...\n");
      await verifyContract(eContractid.BNFTRegistry, bnftRegistryImpl, []);

      // BNFT implementation
      console.log("\n- Verifying BNFT Implementation...\n");
      await verifyContract(eContractid.BNFT, bnftGenericImpl, []);
    }

    // Lend Pool proxy
    console.log("\n- Verifying BNFT Registry Proxy...\n");
    await verifyContract(eContractid.BNFTUpgradeableProxy, bnftRegistryProxy, []);

    console.log("Finished verifications.");
  });
