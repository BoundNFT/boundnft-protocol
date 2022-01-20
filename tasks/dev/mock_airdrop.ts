import { ethers } from "ethers";
import { task } from "hardhat/config";
import { ConfigNames } from "../../helpers/configuration";
import { deployMockAirdrop } from "../../helpers/contracts-deployments";
import {
  getAirdropFlashLoanReceiver,
  getBNFT,
  getBNFTRegistryProxy,
  getMintableERC1155,
  getMintableERC20,
  getMintableERC721,
  getMockAirdropProject,
} from "../../helpers/contracts-getters";
import { getEthersSignerByAddress } from "../../helpers/contracts-helpers";
import { waitForTx } from "../../helpers/misc-utils";
import { eNetwork } from "../../helpers/types";

task("dev:deploy-mock-airdrops", "Deploy mock airdrop for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .setAction(async ({ verify }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }
    const registry = await getBNFTRegistryProxy();
    console.log("BNFTRegistry:", registry.address);
    await deployMockAirdrop([registry.address], verify);
  });

task("dev:apply-airdrop", "Doing apply style airdrop for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("id", "ID of ERC721 token")
  .setAction(async ({ token, id }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }
    const mockAirdropProject = await getMockAirdropProject();
    await waitForTx(await mockAirdropProject.bnftApplyAirdrop(token, id));
    console.log("OK");
  });

task("dev:snapshot-airdrop", "Doing snpashot style airdrop for dev enviroment")
  .addParam("token", "Address of ERC721 contract")
  .addParam("id", "ID of ERC721 token")
  .setAction(async ({ token, id }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    if (network.includes("main")) {
      throw new Error("Mocks not used at mainnet configuration.");
    }
    const mockAirdropProject = await getMockAirdropProject();
    await waitForTx(await mockAirdropProject.bnftSnapshotAirdrop(token, id));
    console.log("OK");
  });

task("dev:flashloan-airdrop", "Doing flash loan for airdrop")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("nftOwner", "Account address of NFT token owner")
  .addParam("nftAsset", "Token address of NFT asset")
  .addParam("nftTokenId", "Token ID of NFT asset")
  .setAction(async ({ pool, nftOwner, nftAsset, nftTokenId }, DRE) => {
    await DRE.run("set-DRE");

    const nftOwnerSigner = await getEthersSignerByAddress(nftOwner);

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(nftAsset);
    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);

    const airdropFlashloanReceiver = await getAirdropFlashLoanReceiver();

    const mockAirdropContract = await getMockAirdropProject();
    const mockAirdropERC20Address = await mockAirdropContract.erc20Token();
    const mockAirdropERC20Token = await getMintableERC20(mockAirdropERC20Address);
    const mockAirdropERC721Address = await mockAirdropContract.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const mockAirdropERC1155Address = await mockAirdropContract.erc1155Token();
    const mockAirdropERC1155Token = await getMintableERC1155(mockAirdropERC1155Address);

    const applyAirdropEncodedData = mockAirdropContract.interface.encodeFunctionData("nativeApplyAirdrop", [
      nftAsset,
      nftTokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [
        [1, 2, 3],
        [mockAirdropERC20Address, mockAirdropERC721Address, mockAirdropERC1155Address],
        [0, 0, nftTokenId],
        mockAirdropContract.address,
        applyAirdropEncodedData,
      ]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    await waitForTx(
      await bnftToken
        .connect(nftOwnerSigner)
        .flashLoan(airdropFlashloanReceiver.address, [nftTokenId], receiverEncodedData)
    );

    console.log("Airdrop ERC20 Balance:", await mockAirdropERC20Token.balanceOf(nftOwner));
    console.log("Airdrop ERC721 Balance:", await mockAirdropERC721Token.balanceOf(nftOwner));
    console.log("Airdrop ERC1155 Balance:", await mockAirdropERC1155Token.balanceOf(nftOwner, nftTokenId));
  });
