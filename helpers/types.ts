import BigNumber from "bignumber.js";

export interface SymbolMap<T> {
  [symbol: string]: T;
}

export type eNetwork = eEthereumNetwork;

export enum eEthereumNetwork {
  develop = "develop",
  kovan = "kovan",
  rinkeby = "rinkeby",
  main = "main",
  coverage = "coverage",
  hardhat = "hardhat",
  localhost = "localhost",
}

export enum BendPools {
  proto = "proto",
}

export enum eContractid {
  IERC721Detailed = "IERC721Detailed",
  BNFTUpgradeableProxy = "BNFTUpgradeableProxy",
  ProxyAdmin = "ProxyAdmin", //BNFT(Registry)
  ProxyAdminWithoutTimelock = "ProxyAdminWithoutTimelock",
  BNFT = "BNFT",
  BNFTRegistry = "BNFTRegistry",
  BNFTRegistryImpl = "BNFTRegistryImpl",

  MintableERC20 = "MintableERC20",
  MintableERC721 = "MintableERC721",
  MintableERC1155 = "MintableERC1155",
  MockBNFT = "MockBNFT",
  MockAirdropProject = "MockAirdropProject",
  MockBNFTMinter = "MockBNFTMinter",
  MockFlashLoanReceiver = "MockFlashLoanReceiver",
  MockVRFCoordinatorV2 = "MockVRFCoordinatorV2",

  AirdropFlashLoanReceiver = "AirdropFlashLoanReceiver",
  AirdropFlashLoanReceiverV2 = "AirdropFlashLoanReceiverV2",
  AirdropDistribution = "AirdropDistribution",
  AirdropDistributionImpl = "AirdropDistributionImpl",
  UserFlashclaimRegistry = "UserFlashclaimRegistry",
  UserFlashclaimRegistryV2 = "UserFlashclaimRegistryV2",

  CryptoPunksMarket = "CryptoPunksMarket",
  WrappedPunk = "WrappedPunk",
  BoundPunkGatewayImpl = "BoundPunkGatewayImpl",
  BoundPunkGateway = "BoundPunkGateway",
}

export type tEthereumAddress = string;
export type tStringTokenBigUnits = string; // 1 ETH, or 10e6 USDC or 10e18 DAI
export type tBigNumberTokenBigUnits = BigNumber;
export type tStringTokenSmallUnits = string; // 1 wei, or 1 basic unit of USDC, or 1 basic unit of DAI
export type tBigNumberTokenSmallUnits = BigNumber;

export interface iNftCommon<T> {
  [key: string]: T;
}
export interface iNftBase<T> {
  WPUNKS: T;
  BAYC: T;
  DOODLE: T;
  COOL: T;
  MEEBITS: T;
  MAYC: T;
  WOW: T;
  CLONEX: T;
  AZUKI: T;
  KONGZ: T;
}

export enum NftContractId {
  WPUNKS = "WPUNKS",
  BAYC = "BAYC",
  DOODLE = "DOODLE",
  COOL = "COOL",
  MEEBITS = "MEEBITS",
  MAYC = "MAYC",
  WOW = "WOW",
  CLONEX = "CLONEX",
  AZUKI = "AZUKI",
  KONGZ = "KONGZ",
}

export type iMultiPoolsNfts<T> = iNftCommon<T> | iBendPoolNfts<T>;

export type iBendPoolNfts<T> = iNftBase<T>;

export type iNftAggregatorBase<T> = iNftBase<T>;

export type iParamsPerNetwork<T> = iEthereumParamsPerNetwork<T>;

export interface iParamsPerNetworkAll<T> extends iEthereumParamsPerNetwork<T> {}

export interface iEthereumParamsPerNetwork<T> {
  [eEthereumNetwork.coverage]: T;
  [eEthereumNetwork.develop]: T;
  [eEthereumNetwork.kovan]: T;
  [eEthereumNetwork.rinkeby]: T;
  [eEthereumNetwork.main]: T;
  [eEthereumNetwork.hardhat]: T;
  [eEthereumNetwork.localhost]: T;
}

export interface iParamsPerPool<T> {
  [BendPools.proto]: T;
}

export interface ObjectString {
  [key: string]: string;
}

export interface IProtocolGlobalConfig {
  NilAddress: tEthereumAddress;
  OneAddress: tEthereumAddress;
}

export interface ICommonConfiguration {
  BNftNamePrefix: string;
  BNftSymbolPrefix: string;

  ProtocolGlobalParams: IProtocolGlobalConfig;

  ProxyAdmin: iParamsPerNetwork<tEthereumAddress | undefined>;
  ProxyAdminWithoutTimelock: iParamsPerNetwork<tEthereumAddress | undefined>;

  BNFTRegistry: iParamsPerNetwork<tEthereumAddress | undefined>;
  BNFTRegistryOwner: iParamsPerNetwork<tEthereumAddress | undefined>;

  CryptoPunksMarket: iParamsPerNetwork<tEthereumAddress | undefined>;
  WrappedPunkToken: iParamsPerNetwork<tEthereumAddress | undefined>;
  BoundPunkGateway: iParamsPerNetwork<tEthereumAddress | undefined>;

  AirdropDistribution: iParamsPerNetwork<tEthereumAddress | undefined>;

  NftsAssets: iParamsPerNetwork<SymbolMap<tEthereumAddress>>;
}

export interface IBendConfiguration extends ICommonConfiguration {}

export interface ITokenAddress {
  [token: string]: tEthereumAddress;
}

export type PoolConfiguration = ICommonConfiguration | IBendConfiguration;
