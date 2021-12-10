import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { getBNFTRegistryProxy, getIErc721Detailed } from "../../helpers/contracts-getters";
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

    console.log("BNFT Registry:", bnftRegistry.address);
    console.log("  - Owner:", await bnftRegistry.owner());
    console.log("  - Name Prefix:", await bnftRegistry.namePrefix());
    console.log("  - Symbol Prefix:", await bnftRegistry.symbolPrefix());
    console.log("  - Generic Implementation:", await bnftRegistry.bNftGenericImpl());

    const nftAssetList = await bnftRegistry.getBNFTAssetList();

    for (const nftAsset of nftAssetList) {
      console.log(`- NFT Asset ${nftAsset}`);
      const nftToken = await getIErc721Detailed(nftAsset);
      const nftName = await nftToken.name();
      const nftSymbol = await nftToken.symbol();
      console.log(`  - Name:${nftName}, Symbol:${nftSymbol}`);

      const { bNftProxy, bNftImpl } = await bnftRegistry.getBNFTAddresses(nftAsset);
      console.log(`  - BNFT Proxy:${bNftProxy}, BNFT Implementation:${bNftImpl}`);

      const bnftToken = await getIErc721Detailed(bNftProxy);
      const bnftName = await bnftToken.name();
      const bnftSymbol = await bnftToken.symbol();
      console.log(`  - BNFT Name:${bnftName}, BNFT Symbol:${bnftSymbol}`);
    }
  });
