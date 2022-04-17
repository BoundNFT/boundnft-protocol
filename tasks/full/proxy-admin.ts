import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { deployBNFTProxyAdmin } from "../../helpers/contracts-deployments";
import { getBNFTProxyAdminByAddress } from "../../helpers/contracts-getters";
import { getParamPerNetwork, insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eNetwork, eContractid } from "../../helpers/types";
import { BNFTProxyAdmin } from "../../types";

task("full:deploy-proxy-admin", "Deploy proxy admin contract")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, DRE) => {
    await DRE.run("set-DRE");
    const poolConfig = loadPoolConfig(pool);
    const network = <eNetwork>DRE.network.name;

    {
      let proxyAdmin: BNFTProxyAdmin;
      const proxyAdminAddress = getParamPerNetwork(poolConfig.ProxyAdmin, network);
      if (proxyAdminAddress == undefined || !notFalsyOrZeroAddress(proxyAdminAddress)) {
        console.log("Deploying new proxy admin...");
        proxyAdmin = await deployBNFTProxyAdmin(eContractid.ProxyAdmin, verify);
      } else {
        console.log("Using proxy admin in pool config...");
        await insertContractAddressInDb(eContractid.ProxyAdmin, proxyAdminAddress);
        proxyAdmin = await getBNFTProxyAdminByAddress(proxyAdminAddress);
      }
      console.log("ProxyAdmin Address:", proxyAdmin.address, "Owner Address:", await proxyAdmin.owner());
    }

    {
      let proxyAdminWithoutTimelock: BNFTProxyAdmin;
      const proxyAdminAddress = getParamPerNetwork(poolConfig.ProxyAdminWithoutTimelock, network);
      if (proxyAdminAddress == undefined || !notFalsyOrZeroAddress(proxyAdminAddress)) {
        console.log("Deploying new proxy admin without timelock ...");
        proxyAdminWithoutTimelock = await deployBNFTProxyAdmin(eContractid.ProxyAdminWithoutTimelock, verify);
      } else {
        console.log("Using proxy admin without timelock in pool config...");
        await insertContractAddressInDb(eContractid.ProxyAdminWithoutTimelock, proxyAdminAddress);
        proxyAdminWithoutTimelock = await getBNFTProxyAdminByAddress(proxyAdminAddress);
      }
      console.log(
        "ProxyAdminWithoutTimelock Address:",
        proxyAdminWithoutTimelock.address,
        "Owner Address:",
        await proxyAdminWithoutTimelock.owner()
      );
    }
  });
