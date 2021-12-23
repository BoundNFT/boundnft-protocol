import rawBRE from "hardhat";
import { MockContract } from "ethereum-waffle";
import {
  deployBNFTRegistry,
  deployBNFTUpgradeableProxy,
  deployBNFTProxyAdmin,
  deployGenericBNFTImpl,
  deployAllMockNfts,
} from "../helpers/contracts-deployments";
import { Signer } from "ethers";
import { eContractid, tEthereumAddress, BendPools } from "../helpers/types";
import { MintableERC721 } from "../types/MintableERC721";
import { ConfigNames, loadPoolConfig } from "../helpers/configuration";
import { initializeMakeSuite } from "./helpers/make-suite";

import { DRE, waitForTx } from "../helpers/misc-utils";

import {
  getSecondSigner,
  getDeploySigner,
  getProxyAdminSigner,
  getBNFTRegistryProxy,
} from "../helpers/contracts-getters";

const buildTestEnv = async (deployer: Signer, secondaryWallet: Signer) => {
  console.time("setup");

  const config = loadPoolConfig(ConfigNames.Bend);

  console.log("-> Prepare mock external ERC721 NFTs, such as WPUNKS, BAYC...");
  const mockNfts: {
    [symbol: string]: MockContract | MintableERC721;
  } = {
    ...(await deployAllMockNfts(false)),
  };

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare proxy admin...");
  const bnftProxyAdmin = await deployBNFTProxyAdmin(eContractid.ProxyAdmin);
  console.log("bnftProxyAdmin:", bnftProxyAdmin.address);

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare bnft registry...");
  const bnftGenericImpl = await deployGenericBNFTImpl(false);

  const bnftRegistryImpl = await deployBNFTRegistry();
  const initEncodedData = bnftRegistryImpl.interface.encodeFunctionData("initialize", [
    bnftGenericImpl.address,
    config.BNftNamePrefix,
    config.BNftSymbolPrefix,
  ]);

  const bnftRegistryProxy = await deployBNFTUpgradeableProxy(
    eContractid.BNFTRegistry,
    bnftProxyAdmin.address,
    bnftRegistryImpl.address,
    initEncodedData
  );

  const bnftRegistry = await getBNFTRegistryProxy(bnftRegistryProxy.address);

  //////////////////////////////////////////////////////////////////////////////
  console.log("-> Prepare bnft tokens...");
  for (const [nftSymbol, mockedNft] of Object.entries(mockNfts) as [string, MintableERC721][]) {
    await waitForTx(await bnftRegistry.createBNFT(mockedNft.address));
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(mockedNft.address);
    console.log("createBNFT:", nftSymbol, bnftAddresses.bNftProxy, bnftAddresses.bNftImpl);
  }

  console.timeEnd("setup");
};

before(async () => {
  await rawBRE.run("set-DRE");
  const deployer = await getDeploySigner();
  const secondaryWallet = await getSecondSigner();
  const FORK = process.env.FORK;

  if (FORK) {
    await rawBRE.run("bend:mainnet", { skipRegistry: true });
  } else {
    console.log("-> Deploying test environment...");
    await buildTestEnv(deployer, secondaryWallet);
  }

  console.log("-> Initialize make suite...");
  await initializeMakeSuite();

  console.log("\n***************");
  console.log("Setup and snapshot finished");
  console.log("***************\n");
});
