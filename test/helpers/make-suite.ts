import { evmRevert, evmSnapshot, DRE, getNowTimeInSeconds } from "../../helpers/misc-utils";
import { Signer } from "ethers";
import {
  getBNFT,
  getMintableERC721,
  getBNFTRegistryProxy,
  getIErc721Detailed,
  getCryptoPunksMarket,
  getWrappedPunk,
  getBoundPunkGateway,
} from "../../helpers/contracts-getters";
import { eEthereumNetwork, eNetwork, tEthereumAddress } from "../../helpers/types";
import { MintableERC721 } from "../../types/MintableERC721";
import { BNFT } from "../../types/BNFT";

import chai from "chai";
// @ts-ignore
import bignumberChai from "chai-bignumber";
import { getEthersSigners } from "../../helpers/contracts-helpers";
import { solidity } from "ethereum-waffle";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BNFTRegistry, CryptoPunksMarket, BoundPunkGateway, WrappedPunk } from "../../types";

chai.use(bignumberChai());
chai.use(solidity);

export interface SignerWithAddress {
  signer: Signer;
  address: tEthereumAddress;
}
export interface TestEnv {
  deployer: SignerWithAddress;
  users: SignerWithAddress[];

  punks: CryptoPunksMarket;

  bnftRegistry: BNFTRegistry;
  bayc: MintableERC721;
  bBAYC: BNFT;

  wpunks: WrappedPunk;
  bWPunks: BNFT;
  boundPunkGateway: BoundPunkGateway;

  tokenIdTracker: number;
  nowTimeTracker: number;
}

let buidlerevmSnapshotId: string = "0x1";
const setBuidlerevmSnapshotId = (id: string) => {
  buidlerevmSnapshotId = id;
};

const testEnv: TestEnv = {
  deployer: {} as SignerWithAddress,
  users: [] as SignerWithAddress[],

  punks: {} as CryptoPunksMarket,

  bnftRegistry: {} as BNFTRegistry,

  bayc: {} as MintableERC721,
  bBAYC: {} as BNFT,

  wpunks: {} as WrappedPunk,
  bWPunks: {} as BNFT,
  boundPunkGateway: {} as BoundPunkGateway,

  tokenIdTracker: {} as number,
  nowTimeTracker: {} as number,
} as TestEnv;

export async function initializeMakeSuite() {
  const [_deployer, ...restSigners] = await getEthersSigners();
  const deployer: SignerWithAddress = {
    address: await _deployer.getAddress(),
    signer: _deployer,
  };

  for (const signer of restSigners) {
    testEnv.users.push({
      signer,
      address: await signer.getAddress(),
    });
  }
  testEnv.deployer = deployer;

  testEnv.punks = await getCryptoPunksMarket();

  testEnv.bnftRegistry = await getBNFTRegistryProxy();

  // NFT Tokens
  let allBNftTokens: { nftAddress: string; nftSymbol: string; bNftAddress: string }[] = [];
  const allNftAssets = await testEnv.bnftRegistry.getBNFTAssetList();
  for (const nftAsset of allNftAssets) {
    const { bNftProxy, bNftImpl } = await testEnv.bnftRegistry.getBNFTAddresses(nftAsset);
    const nftToken = await getIErc721Detailed(nftAsset);
    allBNftTokens.push({
      nftAddress: nftAsset,
      bNftAddress: bNftProxy,
      nftSymbol: await nftToken.symbol(),
    });
  }

  //console.log("allBNftTokens", allBNftTokens);
  const bWPunkAddress = allBNftTokens.find((tokenData) => tokenData.nftSymbol === "WPUNKS")?.bNftAddress;
  const bByacAddress = allBNftTokens.find((tokenData) => tokenData.nftSymbol === "BAYC")?.bNftAddress;

  const wpunksAddress = allBNftTokens.find((tokenData) => tokenData.nftSymbol === "WPUNKS")?.nftAddress;
  const baycAddress = allBNftTokens.find((tokenData) => tokenData.nftSymbol === "BAYC")?.nftAddress;

  if (!bByacAddress || !bWPunkAddress) {
    console.error("Invalid BNFT Tokens", bByacAddress, bWPunkAddress);
    process.exit(1);
  }
  if (!baycAddress || !wpunksAddress) {
    console.error("Invalid NFT Tokens", baycAddress, wpunksAddress);
    process.exit(1);
  }

  testEnv.bBAYC = await getBNFT(bByacAddress);

  testEnv.bayc = await getMintableERC721(baycAddress);

  testEnv.wpunks = await getWrappedPunk();
  testEnv.bWPunks = await getBNFT(bWPunkAddress);
  testEnv.boundPunkGateway = await getBoundPunkGateway();

  testEnv.tokenIdTracker = 100;

  testEnv.nowTimeTracker = Number(await getNowTimeInSeconds());
}

const setSnapshot = async () => {
  const hre = DRE as HardhatRuntimeEnvironment;
  setBuidlerevmSnapshotId(await evmSnapshot());
};

const revertHead = async () => {
  const hre = DRE as HardhatRuntimeEnvironment;
  await evmRevert(buidlerevmSnapshotId);
};

export function makeSuite(name: string, tests: (testEnv: TestEnv) => void) {
  describe(name, () => {
    before(async () => {
      await setSnapshot();
    });
    tests(testEnv);
    after(async () => {
      await revertHead();
    });
  });
}
