import { task } from "hardhat/config";
import { MOCK_NFT_BASE_URIS } from "../../helpers/constants";
import { deployAllMockNfts, deployMintableERC721 } from "../../helpers/contracts-deployments";
import { getCryptoPunksMarket, getDeploySigner, getMintableERC721 } from "../../helpers/contracts-getters";
import { registerContractInJsonDb, tryGetContractAddressInDb } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eNetwork, NftContractId } from "../../helpers/types";
import { MintableERC721 } from "../../types";

task("dev:deploy-mock-nfts", "Deploy mock nfts for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    await localBRE.run("compile");

    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }

    await deployAllMockNfts(verify);
  });

task("dev:cryptopunks-init", "Doing CryptoPunks init task").setAction(async ({}, DRE) => {
  await DRE.run("set-DRE");

  const punks = await getCryptoPunksMarket();
  await punks.allInitialOwnersAssigned();

  await waitForTx(await punks.allInitialOwnersAssigned());
});

task("dev:add-mock-nfts", "Add mock nfts for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    await localBRE.run("compile");

    const tokens: { [symbol: string]: MintableERC721 } = {};

    for (const tokenSymbol of Object.keys(NftContractId)) {
      const tokenName = "Bend Mock " + tokenSymbol;
      const contractId = tokenSymbol.toUpperCase();
      const tokenAddress = await tryGetContractAddressInDb(contractId);
      if (tokenAddress != undefined && notFalsyOrZeroAddress(tokenAddress)) {
        continue;
      }
      tokens[tokenSymbol] = await deployMintableERC721([tokenName, tokenSymbol], verify);
      await registerContractInJsonDb(contractId, tokens[tokenSymbol]);
      console.log(`Symbol: ${tokenSymbol}, Address: ${tokens[tokenSymbol]}`);
    }
  });

task("dev:deploy-new-mock-nft", "Deploy new mock nft for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("name", "Name of mock nft contract")
  .addParam("symbol", "Symbol of mock nft contract")
  .setAction(async ({ verify, name, symbol }, localBRE) => {
    await localBRE.run("set-DRE");
    await localBRE.run("compile");

    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }

    const instance = await deployMintableERC721([name, symbol], verify);
    await registerContractInJsonDb(symbol, instance);
  });

task("dev:set-mock-nfts", "Set mock nfts for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    for (const tokenSymbol of Object.keys(NftContractId)) {
      const contractId = tokenSymbol.toUpperCase();
      if (contractId == "WPUNKS") {
        continue;
      }

      const baseURI = MOCK_NFT_BASE_URIS[tokenSymbol];
      if (baseURI == undefined || baseURI == "") {
        continue;
      }

      const tokenAddress = await tryGetContractAddressInDb(contractId);
      if (tokenAddress == undefined || !notFalsyOrZeroAddress(tokenAddress)) {
        continue;
      }

      const tokenContract = await getMintableERC721(tokenAddress);

      console.log(`${tokenSymbol}, ${tokenAddress}, ${baseURI}`);
      await waitForTx(await tokenContract.setBaseURI(baseURI));
    }
  });

task("dev:mint-mock-nfts", "Deploy mock nfts for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("ids", "ID of ERC721 token")
  .addOptionalParam("target", "Address of target user")
  .setAction(async ({ token, ids, target }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }

    const deployerSinger = await getDeploySigner();
    const deployerAddress = await deployerSinger.getAddress();

    const contract = await getMintableERC721(token);

    const idsAfterSplit = new String(ids).split(",");

    for (const tokenId of idsAfterSplit) {
      await waitForTx(await contract.mint(tokenId));
      if (notFalsyOrZeroAddress(target)) {
        await waitForTx(await contract["safeTransferFrom(address,address,uint256)"](deployerAddress, target, tokenId));
      }
    }

    console.log("ERC721 BalanceOf(Deployer)", (await contract.balanceOf(deployerAddress)).toString());
    if (notFalsyOrZeroAddress(target)) {
      console.log("ERC721 BalanceOf(Target)", (await contract.balanceOf(target)).toString());
    }
  });
