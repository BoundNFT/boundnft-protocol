import { task } from "hardhat/config";
import { ConfigNames, loadPoolConfig } from "../../helpers/configuration";
import { ZERO_ADDRESS } from "../../helpers/constants";
import {
  deployAirdropDistribution,
  deployAirdropFlashLoanReceiver,
  deployBNFTUpgradeableProxy,
} from "../../helpers/contracts-deployments";
import {
  getAddressById,
  getAirdropDistribution,
  getBNFT,
  getBNFTProxyAdminById,
  getBNFTRegistryProxy,
  getBNFTUpgradeableProxy,
  getMintableERC1155,
  getMintableERC20,
  getMockAirdropProject,
} from "../../helpers/contracts-getters";
import { getParamPerNetwork, insertContractAddressInDb } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { eContractid, eNetwork } from "../../helpers/types";
import { AirdropDistribution, BNFTUpgradeableProxy } from "../../types";

task("full:deploy-airdrop-flashloan", "Deploy airdrop flashloan receiver for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .setAction(async ({ verify, pool }, localBRE) => {
    await localBRE.run("set-DRE");
    const network = localBRE.network.name as eNetwork;
    const registry = await getBNFTRegistryProxy();
    console.log("BNFTRegistry:", registry.address);
    const airdropFlashloan = await deployAirdropFlashLoanReceiver([registry.address], verify);
    console.log("AirdropFlashLoanReceiver:", airdropFlashloan.address);
  });

task("full:deploy-airdrop-distribution", "Deploy airdrop distribution for dev enviroment")
  .addFlag("verify", "Verify contracts at Etherscan")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("vrfCoordinator", "Address of Chainlink VRF Coordinator")
  .addParam("subscriptionId", "ID of Chainlink VRF Subscription")
  .setAction(async ({ verify, pool, vrfCoordinator, subscriptionId }, DRE) => {
    await DRE.run("set-DRE");
    const network = DRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const proxyAdmin = await getBNFTProxyAdminById(eContractid.ProxyAdminWithoutTimelock);
    const proxyOwnerAddress = await proxyAdmin.owner();

    const bnftRegistry = await getBNFTRegistryProxy();
    console.log("BNFTRegistry:", bnftRegistry.address);

    const airdropDistributionImpl = await deployAirdropDistribution(verify);

    let airdropDistribution: AirdropDistribution;
    let airdropDistributionProxy: BNFTUpgradeableProxy;

    let airdropDistributionAddress = getParamPerNetwork(poolConfig.AirdropDistribution, network);

    if (airdropDistributionAddress == undefined || !notFalsyOrZeroAddress(airdropDistributionAddress)) {
      console.log("Deploying new airdrop distribution proxy & implementation...");

      const initEncodedData = airdropDistributionImpl.interface.encodeFunctionData("initialize", [
        bnftRegistry.address,
        vrfCoordinator,
        subscriptionId,
      ]);

      airdropDistributionProxy = await deployBNFTUpgradeableProxy(
        eContractid.AirdropDistribution,
        proxyAdmin.address,
        airdropDistributionImpl.address,
        initEncodedData,
        verify
      );

      airdropDistribution = await getAirdropDistribution(airdropDistributionProxy.address);
    } else {
      console.log("Upgrading exist airdrop distribution proxy to new implementation...");
      await insertContractAddressInDb(eContractid.AirdropDistribution, airdropDistributionAddress);

      airdropDistributionProxy = await getBNFTUpgradeableProxy(airdropDistributionAddress);

      // only proxy admin can do upgrading
      const ownerSigner = DRE.ethers.provider.getSigner(proxyOwnerAddress);
      await waitForTx(
        await proxyAdmin.connect(ownerSigner).upgrade(airdropDistributionProxy.address, airdropDistributionImpl.address)
      );

      airdropDistribution = await getAirdropDistribution(airdropDistributionProxy.address);
    }

    console.log(
      "AirdropDistribution: proxy %s, implementation %s",
      airdropDistributionProxy.address,
      airdropDistributionImpl.address
    );
  });

task("dev:create-airdrop-distribution", "Testing airdrop distribution for dev enviroment")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("nftAsset", "Address of NFT Asset")
  .addParam("tokenType", "Type of Airdrop Token")
  .addParam("claimType", "Type of Airdrop Claim")
  .setAction(async ({ pool, nftAsset, tokenType, claimType }, DRE) => {
    await DRE.run("set-DRE");
    const network = DRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const mockAirdropProject = await getMockAirdropProject();
    let airdropToken: string = ZERO_ADDRESS.toString();
    if (tokenType == 1) {
      airdropToken = await mockAirdropProject.erc20Token();
    } else if (tokenType == 2) {
      airdropToken = await mockAirdropProject.erc721Token();
    } else if (tokenType == 3) {
      airdropToken = await mockAirdropProject.erc1155Token();
    }

    console.log("createAirdrop");
    const airdropDistribution = await getAirdropDistribution();
    const airdropId = await airdropDistribution.airdropIdTracker();
    await waitForTx(await airdropDistribution.createAirdrop(nftAsset, airdropToken, tokenType, claimType));
    const airdropData = await airdropDistribution.airdropDatas(airdropId);
    console.log("airdropData:", airdropData);
  });

task("dev:configure-airdrop-distribution", "Testing airdrop distribution for dev enviroment")
  .addParam("pool", `Pool name to retrieve configuration, supported: ${Object.values(ConfigNames)}`)
  .addParam("airdropId", "ID of airdrop")
  .addParam("tokenId", "ID of token")
  .setAction(async ({ pool, airdropId, tokenId }, DRE) => {
    await DRE.run("set-DRE");
    const network = DRE.network.name as eNetwork;
    const poolConfig = loadPoolConfig(pool);

    const airdropDistribution = await getAirdropDistribution();
    const airdropData = await airdropDistribution.airdropDatas(airdropId);
    console.log("airdropData:", airdropData);

    console.log("bnftSnapshotAirdrop");
    const mockAirdropProject = await getMockAirdropProject();
    let airdropToken: string = ZERO_ADDRESS.toString();
    if (airdropData.airdropTokenType.eq(1)) {
      airdropToken = await mockAirdropProject.erc20Token();
    } else if (airdropData.airdropTokenType.eq(2)) {
      airdropToken = await mockAirdropProject.erc721Token();
    } else if (airdropData.airdropTokenType.eq(3)) {
      airdropToken = await mockAirdropProject.erc1155Token();
    }
    const isAirdroped = await mockAirdropProject.airdrops(airdropData.nftAsset, tokenId);
    console.log("isAirdroped:", isAirdroped);
    if (!isAirdroped) {
      await waitForTx(await mockAirdropProject.bnftSnapshotAirdrop(airdropData.nftAsset, tokenId));
    }

    console.log("claimERCXXXAirdrop");
    const boundBAYC = await getBNFT(airdropData.bnftProxy);
    const ownerAddress = await boundBAYC.ownerOf(tokenId);

    const erc1155Id = await mockAirdropProject.getERC1155TokenId(tokenId);

    if (airdropData.airdropTokenType.eq(1)) {
      const erc20Token = await getMintableERC20(airdropToken);
      const erc20Balance = await erc20Token.balanceOf(boundBAYC.address);
      await waitForTx(await boundBAYC.claimERC20Airdrop(airdropToken, airdropDistribution.address, erc20Balance));
    } else if (airdropData.airdropTokenType.eq(2)) {
      await waitForTx(await boundBAYC.claimERC721Airdrop(airdropToken, airdropDistribution.address, [tokenId]));
    } else if (airdropData.airdropTokenType.eq(3)) {
      const erc1155Token = await getMintableERC1155(airdropToken);
      const erc1155Balance = await erc1155Token.balanceOf(boundBAYC.address, erc1155Id);
      console.log("erc1155Token:", airdropToken, "erc1155Id:", erc1155Id, "erc1155Balance:", erc1155Balance);
      await waitForTx(
        await boundBAYC.claimERC1155Airdrop(
          airdropToken,
          airdropDistribution.address,
          [erc1155Id],
          [erc1155Balance],
          []
        )
      );
    }

    if (airdropData.airdropTokenType.eq(3)) {
      console.log("configureERC1155");
      await waitForTx(await airdropDistribution.configureERC1155(airdropId, [erc1155Id]));
    }

    console.log("configureNftUserTokenIds");
    await waitForTx(await airdropDistribution.clearNftUserTokenIds(airdropId, [ownerAddress]));
    await waitForTx(await airdropDistribution.configureNftUserTokenIds(airdropId, [ownerAddress], [tokenId]));

    console.log("ok");
  });
