import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { getBNFT, getBNFTRegistryProxy, getDeploySigner } from "../../helpers/contracts-getters";
import { getEthersSignerByAddress } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eNetwork } from "../../helpers/types";
import { OwnableUpgradeableFactory } from "../../types/OwnableUpgradeableFactory";

task("admin:transfer-owner", "Transfer ownership")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("contract", "Contract address")
  .addParam("target", "Target owner address")
  .setAction(async ({ verify, pool, contract, target }, DRE) => {
    await DRE.run("set-DRE");

    const network = DRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const contractInst = OwnableUpgradeableFactory.connect(contract, await getDeploySigner());
    const currentOwnerAddress = await contractInst.owner();
    console.log("Current Owner Address:", currentOwnerAddress, "Target Owner Address:", target);

    const currentOwnerSigner = await getEthersSignerByAddress(currentOwnerAddress);
    await waitForTx(await contractInst.connect(currentOwnerSigner).transferOwnership(target));
  });

task("admin:claim-airdrop-erc20", "Doing claim airdrop for dev enviroment")
  .addParam("nftAsset", "Address of ERC721 contract")
  .addParam("airToken", "Address of ERC20 contract")
  .addParam("target", "Address of target user")
  .addParam("amount", "Amount of target user")
  .setAction(async ({ nftAsset, airToken, target, amount }, localBRE) => {
    await localBRE.run("set-DRE");

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(nftAsset);
    if (!notFalsyOrZeroAddress(bnftAddresses.bNftProxy)) {
      throw Error("Invalid token address");
    }

    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);
    const ownerAddress = await bnftToken.owner();
    const ownerSigner = await getEthersSignerByAddress(ownerAddress);

    await waitForTx(await bnftToken.connect(ownerSigner).claimERC20Airdrop(airToken, target, amount));
    console.log("OK");
  });

task("admin:claim-airdrop-erc721", "Doing claim airdrop for dev enviroment")
  .addParam("nftAsset", "Address of ERC721 contract")
  .addParam("airToken", "Address of ERC721 contract")
  .addParam("target", "Address of target user")
  .addParam("ids", "ID list of ERC721 token")
  .setAction(async ({ nftAsset, airToken, target, ids }, localBRE) => {
    await localBRE.run("set-DRE");

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(nftAsset);
    if (!notFalsyOrZeroAddress(bnftAddresses.bNftProxy)) {
      throw Error("Invalid token address");
    }

    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);
    const ownerAddress = await bnftToken.owner();
    const ownerSigner = await getEthersSignerByAddress(ownerAddress);

    const idsList = new String(ids).split(",");

    await waitForTx(await bnftToken.connect(ownerSigner).claimERC721Airdrop(airToken, target, idsList));
    console.log("OK");
  });

task("admin:claim-airdrop-erc1155", "Doing claim airdrop for dev enviroment")
  .addParam("nftAsset", "Address of ERC721 contract")
  .addParam("airToken", "Address of ERC1155 contract")
  .addParam("target", "Address of target user")
  .addParam("ids", "ID list of ERC721 token")
  .addParam("amounts", "Amount list of ERC721 token")
  .setAction(async ({ nftAsset, airToken, target, ids, amounts }, localBRE) => {
    await localBRE.run("set-DRE");

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(nftAsset);
    if (!notFalsyOrZeroAddress(bnftAddresses.bNftProxy)) {
      throw Error("Invalid token address");
    }

    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);
    const ownerAddress = await bnftToken.owner();
    const ownerSigner = await getEthersSignerByAddress(ownerAddress);

    const idsList = new String(ids).split(",");
    const amountsList = new String(amounts).split(",");

    await waitForTx(
      await bnftToken.connect(ownerSigner).claimERC1155Airdrop(airToken, target, idsList, amountsList, [])
    );
    console.log("OK");
  });
