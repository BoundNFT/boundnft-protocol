import { Contract } from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { DRE, notFalsyOrZeroAddress } from "./misc-utils";
import { tEthereumAddress, eContractid, NftContractId, PoolConfiguration, eEthereumNetwork } from "./types";
import { MockContract } from "ethereum-waffle";
import { ConfigNames, loadPoolConfig } from "./configuration";
import { getDeploySigner, getFirstSigner } from "./contracts-getters";
import { ZERO_ADDRESS } from "./constants";
import {
  MintableERC721,
  MintableERC721Factory,
  BNFTFactory,
  BNFTRegistryFactory,
  MockBNFTMinterFactory,
  MockFlashLoanReceiverFactory,
  BNFTUpgradeableProxyFactory,
  BNFTProxyAdminFactory,
  MintableERC20Factory,
  MintableERC20,
  MintableERC1155,
  MintableERC1155Factory,
  MockAirdrop,
  MockAirdropFactory,
} from "../types";
import { withSaveAndVerify, registerContractInJsonDb, insertContractAddressInDb } from "./contracts-helpers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const readArtifact = async (id: string) => {
  return (DRE as HardhatRuntimeEnvironment).artifacts.readArtifact(id);
};

export const deployBNFTRegistry = async (verify?: boolean) => {
  const bnftRegistryImpl = await new BNFTRegistryFactory(await getFirstSigner()).deploy();
  await insertContractAddressInDb(eContractid.BNFTRegistryImpl, bnftRegistryImpl.address);
  return withSaveAndVerify(bnftRegistryImpl, eContractid.BNFTRegistry, [], verify);
};

export const deployMintableERC20 = async (args: [string, string, string], verify?: boolean): Promise<MintableERC20> =>
  withSaveAndVerify(
    await new MintableERC20Factory(await getDeploySigner()).deploy(...args),
    eContractid.MintableERC20,
    args,
    verify
  );

export const deployMintableERC721 = async (args: [string, string], verify?: boolean): Promise<MintableERC721> =>
  withSaveAndVerify(
    await new MintableERC721Factory(await getFirstSigner()).deploy(...args),
    eContractid.MintableERC721,
    args,
    verify
  );

export const deployMintableERC1155 = async (args: [], verify?: boolean): Promise<MintableERC1155> =>
  withSaveAndVerify(
    await new MintableERC1155Factory(await getFirstSigner()).deploy(...args),
    eContractid.MintableERC1155,
    args,
    verify
  );

export const deployMockAirdrop = async (args: [], verify?: boolean): Promise<MockAirdrop> =>
  withSaveAndVerify(
    await new MockAirdropFactory(await getFirstSigner()).deploy(...args),
    eContractid.MockAirdrop,
    args,
    verify
  );

export const deployGenericBNFTImpl = async (verify: boolean) =>
  withSaveAndVerify(await new BNFTFactory(await getFirstSigner()).deploy(), eContractid.BNFT, [], verify);

export const deployAllMockNfts = async (verify?: boolean) => {
  const tokens: { [symbol: string]: MockContract | MintableERC721 } = {};

  for (const tokenSymbol of Object.keys(NftContractId)) {
    const tokenName = "Bend Mock " + tokenSymbol;

    tokens[tokenSymbol] = await deployMintableERC721([tokenName, tokenSymbol], verify);
    await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
  }
  return tokens;
};

export const deployMockBNFTMinter = async (args: [tEthereumAddress, tEthereumAddress], verify?: boolean) =>
  withSaveAndVerify(
    await new MockBNFTMinterFactory(await getFirstSigner()).deploy(...args),
    eContractid.MockBNFTMinter,
    args,
    verify
  );

export const deployMockFlashLoanReceiver = async (args: [tEthereumAddress], verify?: boolean) =>
  withSaveAndVerify(
    await new MockFlashLoanReceiverFactory(await getFirstSigner()).deploy(...args),
    eContractid.MockFlashLoanReceiver,
    args,
    verify
  );

export const deployBNFTUpgradeableProxy = async (
  id: string,
  admin: tEthereumAddress,
  logic: tEthereumAddress,
  data: BytesLike,
  verify?: boolean
) =>
  withSaveAndVerify(
    await new BNFTUpgradeableProxyFactory(await getFirstSigner()).deploy(logic, admin, data),
    id,
    [logic, admin, DRE.ethers.utils.hexlify(data)],
    verify
  );

export const deployBNFTProxyAdmin = async (id: string, verify?: boolean) =>
  withSaveAndVerify(await new BNFTProxyAdminFactory(await getFirstSigner()).deploy(), id, [], verify);
