import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { getBNFTRegistryProxy, getIErc721Detailed } from "../../helpers/contracts-getters";
import { getParamPerNetwork } from "../../helpers/contracts-helpers";
import { waitForTx } from "../../helpers/misc-utils";
import { eNetwork } from "../../helpers/types";

task("create-new-bnft", "Create BNFT for new nft asset")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("asset", "Address of underlying nft asset contract")
  .setAction(async ({ pool, asset }, DRE) => {
    await DRE.run("set-DRE");

    const network = <eNetwork>DRE.network.name;
    const poolConfig = loadPoolConfig(pool);

    const bnftRegistryProxyAddress = getParamPerNetwork(poolConfig.BNFTRegistry, network);
    console.log("Pool config BNFTRegistry address:", bnftRegistryProxyAddress);

    const bnftRegistry = await getBNFTRegistryProxy(bnftRegistryProxyAddress);
    console.log("BNFTRegistry address:", bnftRegistry.address);

    await waitForTx(await bnftRegistry.createBNFT(asset, []));

    const { bNftProxy } = await bnftRegistry.getBNFTAddresses(asset);
    const bnftConctract = await getIErc721Detailed(bNftProxy);
    const bnftName = await bnftConctract.name();
    const bnftSymbol = await bnftConctract.symbol();
    console.log(`Created new bnft, address:${bNftProxy}, name:${bnftName}, symbol:${bnftSymbol}`);
  });
