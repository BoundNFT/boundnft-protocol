import { Signer, ethers } from "ethers";
import {
  BNFTFactory,
  BNFTRegistryFactory,
  MintableERC721Factory,
  BNFTUpgradeableProxyFactory,
  BNFTProxyAdminFactory,
} from "../types";
import { IERC721DetailedFactory } from "../types/IERC721DetailedFactory";
import { getEthersSigners, getParamPerNetwork, MockNftMap } from "./contracts-helpers";
import { DRE, getDb, notFalsyOrZeroAddress, omit } from "./misc-utils";
import { eContractid, PoolConfiguration, tEthereumAddress, NftContractId, eNetwork } from "./types";

export const getFirstSigner = async () => (await getEthersSigners())[0];

export const getSecondSigner = async () => (await getEthersSigners())[1];

export const getThirdSigner = async () => (await getEthersSigners())[2];

export const getDeploySigner = async () => (await getEthersSigners())[0];

export const getPoolOwnerSigner = async () => (await getEthersSigners())[0];

export const getProxyAdminSigner = async () => (await getEthersSigners())[2];

export const getBNFTRegistryProxy = async (address?: tEthereumAddress) => {
  return await BNFTRegistryFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.BNFTRegistry}`).value()).address,
    await getFirstSigner()
  );
};

export const getBNFT = async (address?: tEthereumAddress) =>
  await BNFTFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.BNFT}`).value()).address,
    await getFirstSigner()
  );

export const getMintableERC721 = async (address: tEthereumAddress) =>
  await MintableERC721Factory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.MintableERC721}`).value()).address,
    await getFirstSigner()
  );

export const getIErc721Detailed = async (address: tEthereumAddress) =>
  await IERC721DetailedFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.IERC721Detailed}`).value()).address,
    await getFirstSigner()
  );

export const getConfigMockedNfts = async (config: PoolConfiguration) => {
  const nftsAssets = getParamPerNetwork(config.NftsAssets, DRE.network.name as eNetwork);
  const tokenSymbols = Object.keys(nftsAssets);
  const db = getDb(DRE.network.name);
  const tokens: MockNftMap = await tokenSymbols.reduce<Promise<MockNftMap>>(async (acc, tokenSymbol) => {
    const accumulator = await acc;
    const address = db.get(`${tokenSymbol.toUpperCase()}`).value().address;
    accumulator[tokenSymbol] = await getMintableERC721(address);
    return Promise.resolve(acc);
  }, Promise.resolve({}));
  return tokens;
};

export const getAllMockedNfts = async () => {
  const db = getDb(DRE.network.name);
  const tokens: MockNftMap = await Object.keys(NftContractId).reduce<Promise<MockNftMap>>(async (acc, tokenSymbol) => {
    const accumulator = await acc;
    const address = db.get(`${tokenSymbol.toUpperCase()}`).value().address;
    accumulator[tokenSymbol] = await getMintableERC721(address);
    return Promise.resolve(acc);
  }, Promise.resolve({}));
  return tokens;
};

export const getBNFTUpgradeableProxy = async (address: tEthereumAddress) =>
  BNFTUpgradeableProxyFactory.connect(address, await getFirstSigner());

export const getBNFTProxyAdminByAddress = async (address: tEthereumAddress) =>
  BNFTProxyAdminFactory.connect(address, await getFirstSigner());

export const getBNFTProxyAdminById = async (id: string) =>
  BNFTProxyAdminFactory.connect((await getDb(DRE.network.name).get(`${id}`).value()).address, await getFirstSigner());

export const getBNFTRegistryImpl = async (address?: tEthereumAddress) => {
  return await BNFTRegistryFactory.connect(
    address || (await getDb(DRE.network.name).get(`${eContractid.BNFTRegistryImpl}`).value()).address,
    await getFirstSigner()
  );
};

export const getAddressById = async (id: string): Promise<tEthereumAddress | undefined> =>
  (await getDb(DRE.network.name).get(`${id}`).value())?.address || undefined;
