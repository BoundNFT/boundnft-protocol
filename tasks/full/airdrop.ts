import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import {
  deployAirdropDistribution,
  deployAirdropFlashLoanReceiver,
  deployBNFTUpgradeableProxy,
} from "../../helpers/contracts-deployments";
import {
  getAirdropDistribution,
  getBNFTProxyAdminById,
  getBNFTRegistryProxy,
  getBNFTUpgradeableProxy,
} from "../../helpers/contracts-getters";
import { getParamPerNetwork, insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eContractid, eNetwork } from "../../helpers/types";
import { AirdropDistribution, BNFTUpgradeableProxy } from "../../types";

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

task("full:deploy-airdrop-distribution", "Deploy airdrop distribution for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("vrfCoordinator", "Address of Chainlink VRF Coordinator")
  .addParam("subscriptionId", "ID of Chainlink VRF Subscription")
  .setAction(async ({ verify, pool, vrfCoordinator, subscriptionId }, DRE) => {
    await DRE.run("set-DRE");
    const network = DRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const proxyAdmin = await getBNFTProxyAdminById(eContractid.ProxyAdminWithoutTimelock);
    const proxyOwnerAddress = await proxyAdmin.owner();

    const bnftRegistry = await getBNFTRegistryProxy();
    console.log("BNFTRegistry:", bnftRegistry.address);

    const airdropDistributionImpl = await deployAirdropDistribution(verify);

    let airdropDistribution: AirdropDistribution;
    let airdropDistributionProxy: BNFTUpgradeableProxy;

    let airdropDistributionAddress = getParamPerNetwork(poolConfig.AirdropDistribution, network);

    if (airdropDistributionAddress == undefined || !notFalsyOrZeroAddress(airdropDistributionAddress)) {
      console.log("Deploying new airdrop distribution proxy & implementation...");

      const initEncodedData = airdropDistributionImpl.interface.encodeFunctionData("initialize", [
        bnftRegistry.address,
        vrfCoordinator,
        subscriptionId,
      ]);

      airdropDistributionProxy = await deployBNFTUpgradeableProxy(
        eContractid.AirdropDistribution,
        proxyAdmin.address,
        airdropDistributionImpl.address,
        initEncodedData,
        verify
      );

      airdropDistribution = await getAirdropDistribution(airdropDistributionProxy.address);
    } else {
      console.log("Upgrading exist airdrop distribution proxy to new implementation...");
      await insertContractAddressInDb(eContractid.AirdropDistribution, airdropDistributionAddress);

      airdropDistributionProxy = await getBNFTUpgradeableProxy(airdropDistributionAddress);

      // only proxy admin can do upgrading
      const ownerSigner = DRE.ethers.provider.getSigner(proxyOwnerAddress);
      await waitForTx(
        await proxyAdmin.connect(ownerSigner).upgrade(airdropDistributionProxy.address, airdropDistributionImpl.address)
      );

      airdropDistribution = await getAirdropDistribution(airdropDistributionProxy.address);
    }

    console.log(
      "AirdropDistribution: proxy %s, implementation %s",
      airdropDistributionProxy.address,
      airdropDistributionImpl.address
    );
  });
