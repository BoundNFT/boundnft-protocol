import { task } from "hardhat/config";
import { loadPoolConfig, ConfigNames } from "../../helpers/configuration";
import {
  getBNFTUpgradeableProxy,
  getBNFT,
  getBNFTRegistryImpl,
  getBNFTRegistryProxy,
  getIErc721Detailed,
  getBNFTProxyAdminByAddress,
  getAirdropFlashLoanReceiver,
  getBoundPunkGateway,
  getBoundPunkGatewayImpl,
  getAirdropDistributionImpl,
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

    const proxyAdminWTLAddress = getParamPerNetwork(poolConfig.ProxyAdminWithoutTimelock, network);
    if (proxyAdminWTLAddress == undefined || !notFalsyOrZeroAddress(proxyAdminWTLAddress)) {
      throw Error("Invalid proxy admin without timelock address in pool config");
    }
    const proxyAdminWTL = await getBNFTProxyAdminByAddress(proxyAdminWTLAddress);
    await verifyContract(eContractid.ProxyAdminWithoutTimelock, proxyAdminWTL, []);

    const bnftRegistryProxy = await getBNFTRegistryProxy();
    const registryOwnerAddress = await bnftRegistryProxy.owner();
    const claimAdminAddress = await bnftRegistryProxy.claimAdmin();

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
        claimAdminAddress,
      ]);
      await verifyContract(eContractid.BNFTUpgradeableProxy, bnftTokenProxy, [
        bnftGenericImpl.address,
        bnftRegistryProxy.address,
        initEncodedData,
      ]);
    }

    // Punk Gateway proxy
    {
      console.log("\n- Verifying BoundPunkGateway Proxy...\n");
      let punkAddress = getParamPerNetwork(poolConfig.CryptoPunksMarket, network);
      if (punkAddress == undefined || !notFalsyOrZeroAddress(punkAddress)) {
        throw new Error("Invald CryptoPunksMarket in config");
      }
      let wpunkAddress = getParamPerNetwork(poolConfig.WrappedPunkToken, network);
      if (wpunkAddress == undefined || !notFalsyOrZeroAddress(wpunkAddress)) {
        throw new Error("Invald WrappedPunkToken in config");
      }
      let bnftRegistryProxyAddress = getParamPerNetwork(poolConfig.BNFTRegistry, network);
      if (bnftRegistryProxyAddress == undefined || !notFalsyOrZeroAddress(bnftRegistryProxyAddress)) {
        throw new Error("Invald BNFTRegistry in config");
      }

      const boundPunkGatewayImpl = await getBoundPunkGatewayImpl();
      console.log("\n- Verifying BoundPunkGateway Implementation...\n", boundPunkGatewayImpl.address);
      await verifyContract(eContractid.BoundPunkGatewayImpl, boundPunkGatewayImpl, []);

      const boundPunkGateway = await getBoundPunkGateway();
      const initEncodedData = boundPunkGatewayImpl.interface.encodeFunctionData("initialize", [
        punkAddress,
        wpunkAddress,
        bnftRegistryProxyAddress,
      ]);
      await verifyContract(eContractid.BNFTUpgradeableProxy, boundPunkGateway, [
        boundPunkGatewayImpl.address,
        proxyAdmin.address,
        initEncodedData,
      ]);
    }

    console.log("Finished verifications.");
  });

task("verify:bnft", "Verify bnft contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("asset", "Address of ERC721 Token")
  .setAction(async ({ asset, pool }, localDRE) => {
    await localDRE.run("set-DRE");
    const network = localDRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const bnftRegistryProxy = await getBNFTRegistryProxy();
    const registryOwnerAddress = await bnftRegistryProxy.owner();
    const claimAdminAddress = await bnftRegistryProxy.claimAdmin();

    const bnftRegistryImpl = await getBNFTRegistryImpl();
    const bnftGenericImpl = await getBNFT();

    const assetContract = await getIErc721Detailed(asset);
    const nftSymbol = await assetContract.symbol();

    console.log(`\n- Verifying BNFT Proxy for ${asset} ...\n`);

    const bnftAddresses = await bnftRegistryProxy.getBNFTAddresses(asset);
    console.log(`\n- BNFT Proxy ${bnftAddresses.bNftProxy} Impl ${bnftAddresses.bNftImpl} ...\n`);

    const bnftTokenProxy = await getBNFTUpgradeableProxy(bnftAddresses.bNftProxy);
    const initEncodedData = bnftGenericImpl.interface.encodeFunctionData("initialize", [
      asset,
      poolConfig.BNftNamePrefix + " " + nftSymbol,
      poolConfig.BNftSymbolPrefix + nftSymbol,
      registryOwnerAddress,
      claimAdminAddress,
    ]);
    await verifyContract(eContractid.BNFTUpgradeableProxy, bnftTokenProxy, [
      bnftGenericImpl.address,
      bnftRegistryProxy.address,
      initEncodedData,
    ]);

    console.log(`\n- Verifying AirdropFlashLoanReceiver ...\n`);
    const airdropFlashloanReceiver = await getAirdropFlashLoanReceiver();
    await verifyContract(eContractid.AirdropFlashLoanReceiver, airdropFlashloanReceiver, [bnftRegistryProxy.address]);

    console.log("Finished verifications.");
  });

task("verify:airdrop-flashloan", "Verify airdrop flashloan contracts at Etherscan").setAction(async ({}, localDRE) => {
  await localDRE.run("set-DRE");
  const network = localDRE.network.name as eNetwork;

  const registry = await getBNFTRegistryProxy();

  const airdropDistribution = await getAirdropDistributionImpl();
  await verifyContract(eContractid.AirdropDistributionImpl, airdropDistribution, []);

  const airdropFlashloanReceiver = await getAirdropFlashLoanReceiver();
  await verifyContract(eContractid.AirdropFlashLoanReceiver, airdropFlashloanReceiver, [registry.address]);

  console.log("Finished verifications.");
});
