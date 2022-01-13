import { task } from "hardhat/config";
import { loadPoolConfig, ConfigNames } from "../../helpers/configuration";
import {
  getBNFTUpgradeableProxy,
  getBNFT,
  getBNFTRegistryImpl,
  getBNFTRegistryProxy,
  getIErc721Detailed,
  getBNFTProxyAdminByAddress,
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

    // Proxy Admin
    const proxyAdminAddress = getParamPerNetwork(poolConfig.ProxyAdmin, network);
    if (proxyAdminAddress == undefined || !notFalsyOrZeroAddress(proxyAdminAddress)) {
      throw Error("Invalid proxy admin address in pool config");
    }
    const proxyAdmin = await getBNFTProxyAdminByAddress(proxyAdminAddress);
    await verifyContract(eContractid.ProxyAdmin, proxyAdmin, []);

    const bnftRegistryProxy = await getBNFTRegistryProxy();
    const registryOwnerAddress = await bnftRegistryProxy.owner();

    const bnftRegistryImpl = await getBNFTRegistryImpl();
    const bnftGenericImpl = await getBNFT();

    // BNFT Registry implementation
    console.log("\n- Verifying BNFT Registry Implementation...\n", bnftRegistryImpl.address);
    await verifyContract(eContractid.BNFTRegistry, bnftRegistryImpl, []);

    // BNFT implementation
    console.log("\n- Verifying BNFT Generic Implementation...\n", bnftGenericImpl.address);
    await verifyContract(eContractid.BNFT, bnftGenericImpl, []);

    // BNFT Registry proxy
    console.log("\n- Verifying BNFT Registry Proxy...\n");
    const initEncodedData = bnftRegistryImpl.interface.encodeFunctionData("initialize", [
      bnftGenericImpl.address,
      poolConfig.BNftNamePrefix,
      poolConfig.BNftSymbolPrefix,
    ]);
    await verifyContract(eContractid.BNFTUpgradeableProxy, bnftRegistryProxy, [
      bnftRegistryImpl.address,
      proxyAdmin.address,
      initEncodedData,
    ]);

    // All BNFT proxys
    console.log("\n- Verifying All BNFT Proxys...\n");
    const allNFTAssets = await bnftRegistryProxy.getBNFTAssetList();
    for (const nftAsset of allNFTAssets) {
      const nftToken = await getIErc721Detailed(nftAsset);
      const nftSymbol = await nftToken.symbol();

      console.log(`\n- Verifying BNFT Proxy for ${nftSymbol} ...\n`);

      const bnftAddresses = await bnftRegistryProxy.getBNFTAddresses(nftAsset);
      console.log(`\n- BNFT Proxy ${bnftAddresses.bNftProxy} Impl ${bnftAddresses.bNftImpl} ...\n`);

      const bnftTokenProxy = await getBNFTUpgradeableProxy(bnftAddresses.bNftProxy);
      const initEncodedData = bnftGenericImpl.interface.encodeFunctionData("initialize", [
        nftAsset,
        poolConfig.BNftNamePrefix + " " + nftSymbol,
        poolConfig.BNftSymbolPrefix + nftSymbol,
        registryOwnerAddress,
      ]);
      await verifyContract(eContractid.BNFTUpgradeableProxy, bnftTokenProxy, [
        bnftGenericImpl.address,
        bnftRegistryProxy.address,
        initEncodedData,
      ]);
    }

    console.log("Finished verifications.");
  });
