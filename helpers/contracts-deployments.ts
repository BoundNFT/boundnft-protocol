import { BytesLike } from "@ethersproject/bytes";
import { DRE, waitForTx } from "./misc-utils";
import { tEthereumAddress, eContractid, NftContractId } from "./types";
import { MockContract } from "ethereum-waffle";
import { getDeploySigner } from "./contracts-getters";
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
  MockAirdropProject,
  MockAirdropProjectFactory,
  AirdropFlashLoanReceiverFactory,
  AirdropFlashLoanReceiver,
  UserFlashclaimRegistry,
  UserFlashclaimRegistryFactory,
  UserFlashclaimRegistryV2,
  UserFlashclaimRegistryV2Factory,
  CryptoPunksMarketFactory,
  WrappedPunkFactory,
  BoundPunkGatewayFactory,
  WrappedPunk,
  AirdropDistributionFactory,
  MockVRFCoordinatorV2Factory,
  AirdropFlashLoanReceiverV2,
  AirdropFlashLoanReceiverV2Factory,
  UserFlashclaimRegistryV3,
  UserFlashclaimRegistryV3Factory,
  AirdropFlashLoanReceiverV3,
  AirdropFlashLoanReceiverV3Factory,
} from "../types";
import { withSaveAndVerify, registerContractInJsonDb, insertContractAddressInDb } from "./contracts-helpers";

export const deployBNFTRegistry = async (verify?: boolean) => {
  const bnftRegistryImpl = await new BNFTRegistryFactory(await getDeploySigner()).deploy();
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
    await new MintableERC721Factory(await getDeploySigner()).deploy(...args),
    eContractid.MintableERC721,
    args,
    verify
  );

export const deployMintableERC1155 = async (args: [], verify?: boolean): Promise<MintableERC1155> =>
  withSaveAndVerify(
    await new MintableERC1155Factory(await getDeploySigner()).deploy(...args),
    eContractid.MintableERC1155,
    args,
    verify
  );

export const deployMockAirdrop = async (args: [string], verify?: boolean): Promise<MockAirdropProject> =>
  withSaveAndVerify(
    await new MockAirdropProjectFactory(await getDeploySigner()).deploy(...args),
    eContractid.MockAirdropProject,
    args,
    verify
  );

export const deployGenericBNFTImpl = async (verify: boolean) =>
  withSaveAndVerify(await new BNFTFactory(await getDeploySigner()).deploy(), eContractid.BNFT, [], verify);

export const deployAllMockNfts = async (verify?: boolean) => {
  const tokens: { [symbol: string]: MockContract | MintableERC721 | WrappedPunk } = {};

  for (const tokenSymbol of Object.keys(NftContractId)) {
    if (tokenSymbol === "WPUNKS") {
      const cryptoPunksMarket = await deployCryptoPunksMarket([], verify);
      const wrappedPunk = await deployWrappedPunk([cryptoPunksMarket.address], verify);
      tokens[tokenSymbol] = wrappedPunk;
      await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
      continue;
    }

    const tokenName = "BendDAO Mock " + tokenSymbol;

    tokens[tokenSymbol] = await deployMintableERC721([tokenName, tokenSymbol], verify);
    await registerContractInJsonDb(tokenSymbol.toUpperCase(), tokens[tokenSymbol]);
  }
  return tokens;
};

export const deployMockBNFTMinter = async (args: [tEthereumAddress, tEthereumAddress], verify?: boolean) =>
  withSaveAndVerify(
    await new MockBNFTMinterFactory(await getDeploySigner()).deploy(...args),
    eContractid.MockBNFTMinter,
    args,
    verify
  );

export const deployMockFlashLoanReceiver = async (args: [tEthereumAddress], verify?: boolean) =>
  withSaveAndVerify(
    await new MockFlashLoanReceiverFactory(await getDeploySigner()).deploy(...args),
    eContractid.MockFlashLoanReceiver,
    args,
    verify
  );

export const deployMockMockVRFCoordinatorV2 = async (args: [string, string], verify?: boolean) =>
  withSaveAndVerify(
    await new MockVRFCoordinatorV2Factory(await getDeploySigner()).deploy(...args),
    eContractid.MockVRFCoordinatorV2,
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
    await new BNFTUpgradeableProxyFactory(await getDeploySigner()).deploy(logic, admin, data),
    id,
    [logic, admin, DRE.ethers.utils.hexlify(data)],
    verify
  );

export const deployBNFTProxyAdmin = async (id: string, verify?: boolean) =>
  withSaveAndVerify(await new BNFTProxyAdminFactory(await getDeploySigner()).deploy(), id, [], verify);

export const deployAirdropFlashLoanReceiver = async (
  owner: tEthereumAddress,
  registry: tEthereumAddress,
  deployType: string,
  verify?: boolean
): Promise<AirdropFlashLoanReceiver> =>
  withSaveAndVerify(
    await new AirdropFlashLoanReceiverFactory(await getDeploySigner()).deploy(owner, registry, deployType),
    eContractid.AirdropFlashLoanReceiver,
    [owner, registry, deployType],
    verify
  );

export const deployAirdropFlashLoanReceiverV2 = async (
  owner: tEthereumAddress,
  registry: tEthereumAddress,
  deployType: string,
  verify?: boolean
): Promise<AirdropFlashLoanReceiverV2> => {
  const receiver = await withSaveAndVerify(
    await new AirdropFlashLoanReceiverV2Factory(await getDeploySigner()).deploy(),
    eContractid.AirdropFlashLoanReceiverV2,
    [],
    verify
  );
  await waitForTx(await receiver.initialize(owner, registry, deployType));
  return receiver;
};

export const deployAirdropFlashLoanReceiverV3Impl = async (verify?: boolean): Promise<AirdropFlashLoanReceiverV3> =>
  withSaveAndVerify(
    await new AirdropFlashLoanReceiverV3Factory(await getDeploySigner()).deploy(),
    eContractid.AirdropFlashLoanReceiverV3Impl,
    [],
    verify
  );

export const deployUserFlashclaimRegistry = async (args: [string], verify?: boolean): Promise<UserFlashclaimRegistry> =>
  withSaveAndVerify(
    await new UserFlashclaimRegistryFactory(await getDeploySigner()).deploy(...args),
    eContractid.UserFlashclaimRegistry,
    args,
    verify
  );

export const deployUserFlashclaimRegistryV2 = async (
  args: [string, string],
  verify?: boolean
): Promise<UserFlashclaimRegistryV2> =>
  withSaveAndVerify(
    await new UserFlashclaimRegistryV2Factory(await getDeploySigner()).deploy(...args),
    eContractid.UserFlashclaimRegistryV2,
    args,
    verify
  );

export const deployUserFlashclaimRegistryV3 = async (verify?: boolean): Promise<UserFlashclaimRegistryV3> => {
  const registryImpl = await withSaveAndVerify(
    await new UserFlashclaimRegistryV3Factory(await getDeploySigner()).deploy(),
    eContractid.UserFlashclaimRegistryV3Impl,
    [],
    verify
  );
  return withSaveAndVerify(registryImpl, eContractid.UserFlashclaimRegistryV3, [], verify);
};

export const deployAirdropDistribution = async (verify?: boolean) => {
  const contractImpl = await new AirdropDistributionFactory(await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.AirdropDistributionImpl, contractImpl.address);
  return withSaveAndVerify(contractImpl, eContractid.AirdropDistribution, [], verify);
};

export const deployCryptoPunksMarket = async (args: [], verify?: boolean) =>
  withSaveAndVerify(
    await new CryptoPunksMarketFactory(await getDeploySigner()).deploy(...args),
    eContractid.CryptoPunksMarket,
    args,
    verify
  );

export const deployWrappedPunk = async (args: [tEthereumAddress], verify?: boolean) =>
  withSaveAndVerify(
    await new WrappedPunkFactory(await getDeploySigner()).deploy(...args),
    eContractid.WrappedPunk,
    args,
    verify
  );

export const deployBoundPunkGateway = async (verify?: boolean) => {
  const punkImpl = await new BoundPunkGatewayFactory(await getDeploySigner()).deploy();
  await insertContractAddressInDb(eContractid.BoundPunkGatewayImpl, punkImpl.address);
  return withSaveAndVerify(punkImpl, eContractid.BoundPunkGateway, [], verify);
};
