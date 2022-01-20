import { task } from "hardhat/config";
import { ConfigNames } from "../../helpers/configuration";
import { deployMockBNFTMinter } from "../../helpers/contracts-deployments";
import {
  getBNFT,
  getBNFTRegistryProxy,
  getDeploySigner,
  getMintableERC721,
  getMockBNFTMinter,
} from "../../helpers/contracts-getters";
import { waitForTx } from "../../helpers/misc-utils";
import { eNetwork } from "../../helpers/types";

task("dev:deploy-mock-minters", "Deploy mock bnfts for dev enviroment")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("nftAsset", "Address of ERC721 contract")
  .setAction(async ({ nftAsset }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(nftAsset);

    await deployMockBNFTMinter([nftAsset, bnftAddresses.bNftProxy]);
  });

task("dev:mint-mock-bnfts", "Deploy mock bnfts for dev enviroment")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("nftAsset", "Address of ERC721 contract")
  .addParam("nftTokenIds", "Token ID list of ERC721 token")
  .setAction(async ({ nftAsset, nftTokenIds }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }

    const deployerSinger = await getDeploySigner();
    const deployerAddress = await deployerSinger.getAddress();

    const mockBNFTMinter = await getMockBNFTMinter();

    const nftAssetContract = await getMintableERC721(nftAsset);
    await waitForTx(await nftAssetContract.setApprovalForAll(mockBNFTMinter.address, true));

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(nftAsset);
    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);

    const idsAfterSplit = new String(nftTokenIds).split(",");

    for (const tokenId of idsAfterSplit) {
      await waitForTx(await mockBNFTMinter.mint(deployerAddress, tokenId));
      const tokenOwner = await bnftToken.ownerOf(tokenId);
      console.log(`BNFT ownerOf(${tokenId}): ${tokenOwner}`);
    }
  });
