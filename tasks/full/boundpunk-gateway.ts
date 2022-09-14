import { task } from "hardhat/config";
import { waitForTx, notFalsyOrZeroAddress } from "../../helpers/misc-utils";
import { eNetwork, eContractid } from "../../helpers/types";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { deployBNFTUpgradeableProxy, deployBoundPunkGateway } from "../../helpers/contracts-deployments";
import { getBNFTUpgradeableProxy, getBNFTProxyAdminById, getBoundPunkGateway } from "../../helpers/contracts-getters";
import { getParamPerNetwork, insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { BNFTUpgradeableProxy, BoundPunkGateway } from "../../types";

task("full:deploy-boundpunk-gateway", "Deploy BoundPunk Gateway for full enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, DRE) => {
    await DRE.run("set-DRE");
    await DRE.run("compile");

    const network = <eNetwork>DRE.network.name;

    const poolConfig = loadPoolConfig(pool);

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

    const proxyAdmin = await getBNFTProxyAdminById(eContractid.ProxyAdmin);
    const proxyOwnerAddress = await proxyAdmin.owner();

    const boundPunkGatewayImpl = await deployBoundPunkGateway(verify);

    let boundPunkGateway: BoundPunkGateway;
    let boundPunkGatewayProxy: BNFTUpgradeableProxy;

    let boundPunkGatewayProxyAddress = getParamPerNetwork(poolConfig.BoundPunkGateway, network);
    if (boundPunkGatewayProxyAddress == undefined || !notFalsyOrZeroAddress(boundPunkGatewayProxyAddress)) {
      console.log("Deploying new BoundPunkGateway proxy & implementation...");

      const initEncodedData = boundPunkGatewayImpl.interface.encodeFunctionData("initialize", [
        punkAddress,
        wpunkAddress,
        bnftRegistryProxyAddress,
      ]);

      boundPunkGatewayProxy = await deployBNFTUpgradeableProxy(
        eContractid.BoundPunkGateway,
        proxyAdmin.address,
        boundPunkGatewayImpl.address,
        initEncodedData,
        verify
      );

      boundPunkGateway = await getBoundPunkGateway(boundPunkGatewayProxy.address);
    } else {
      console.log("Upgrading exist BoundPunkGateway proxy to new implementation...");
      await insertContractAddressInDb(eContractid.BoundPunkGateway, boundPunkGatewayProxyAddress);

      boundPunkGatewayProxy = await getBNFTUpgradeableProxy(boundPunkGatewayProxyAddress);

      // only proxy admin can do upgrading
      const ownerSigner = DRE.ethers.provider.getSigner(proxyOwnerAddress);
      await waitForTx(
        await proxyAdmin.connect(ownerSigner).upgrade(boundPunkGatewayProxy.address, boundPunkGatewayImpl.address)
      );

      boundPunkGateway = await getBoundPunkGateway(boundPunkGatewayProxy.address);
    }

    console.log(
      "BoundPunkGateway: proxy %s, implementation %s",
      boundPunkGateway.address,
      boundPunkGatewayImpl.address
    );
  });
