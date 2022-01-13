import { task } from "hardhat/config";
import { deployMockAirdrop } from "../../helpers/contracts-deployments";
import { getMockAirdrop } from "../../helpers/contracts-getters";
import { waitForTx } from "../../helpers/misc-utils";

task("dev:deploy-mock-airdrops", "Deploy mock airdrop for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    await deployMockAirdrop([], verify);
  });

task("dev:airdrop-erc20", "Doing airdrop ERC20 for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("id", "ID of ERC721 token")
  .setAction(async ({ token, id }, localBRE) => {
    await localBRE.run("set-DRE");
    const mockAirdrop = await getMockAirdrop();
    await waitForTx(await mockAirdrop.airdropERC20(token, id));
    console.log("OK");
  });

task("dev:airdrop-erc721", "Doing airdrop ERC721 for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("id", "ID of ERC721 token")
  .setAction(async ({ token, id }, localBRE) => {
    await localBRE.run("set-DRE");
    const mockAirdrop = await getMockAirdrop();
    await waitForTx(await mockAirdrop.airdropERC721(token, id));
    console.log("OK");
  });

task("dev:airdrop-erc1155", "Doing airdrop ERC1155 for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("id", "ID of ERC721 token")
  .setAction(async ({ token, id }, localBRE) => {
    await localBRE.run("set-DRE");
    const mockAirdrop = await getMockAirdrop();
    await waitForTx(await mockAirdrop.airdropERC1155(token, id));
    console.log("OK");
  });
