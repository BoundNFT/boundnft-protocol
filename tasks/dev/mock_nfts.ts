import { task } from "hardhat/config";
import { deployAllMockNfts } from "../../helpers/contracts-deployments";
import { getDeploySigner, getMintableERC721 } from "../../helpers/contracts-getters";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eNetwork } from "../../helpers/types";

task("dev:deploy-mock-nfts", "Deploy mock nfts for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");

    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }

    await deployAllMockNfts(verify);
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
