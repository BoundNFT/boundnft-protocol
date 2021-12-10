import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { getBNFTRegistryProxy } from "../../helpers/contracts-getters";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { DRE } from "../../helpers/misc-utils";
import { eEthereumNetwork, eNetwork } from "../../helpers/types";

task("print-config", "Print config of all reserves and nfts")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ pool }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = process.env.FORK ? (process.env.FORK as eNetwork) : (localBRE.network.name as eNetwork);
    const poolConfig = loadPoolConfig(pool);

    const bnftRegistryAddress = getParamPerNetwork(poolConfig.BNFTRegistry, network);
    const bnftRegistry = await getBNFTRegistryProxy(bnftRegistryAddress);

    console.log("BNFT Registry: ", bnftRegistry.address);
    const nftAssetList = await bnftRegistry.getBNFTAssetList();

    for (const nftAsset of nftAssetList) {
      console.log(`- NFT Asset ${nftAsset}`);
      const { bNftProxy, bNftImpl } = await bnftRegistry.getBNFTAddresses(nftAsset);
      console.log(`  - BNFT Proxy:${bNftProxy}, BNFT Implementation:${bNftImpl}`, bNftProxy, bNftImpl);
    }
  });
