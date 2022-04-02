import { ICommonConfiguration, eEthereumNetwork } from '../helpers/types';

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------

export const CommonsConfig: ICommonConfiguration = {
  BNftNamePrefix: 'Bound NFT',
  BNftSymbolPrefix: 'bound',

  ProtocolGlobalParams: {
    NilAddress: '0x0000000000000000000000000000000000000000',
    OneAddress: '0x0000000000000000000000000000000000000001',
  },

  // ----------------
  // COMMON PROTOCOL ADDRESSES ACROSS POOLS
  // ----------------

  ProxyAdmin: {
    [eEthereumNetwork.coverage]: undefined,
    [eEthereumNetwork.hardhat]: undefined,
    [eEthereumNetwork.localhost]: undefined,
    [eEthereumNetwork.develop]: '0xFA2975862160e2E3A522f40c59174a9Fd0b5D67B',
    [eEthereumNetwork.rinkeby]: '0x8601bCbDC41a6Fe6422764EF1Dc8ccb7fa8B891B',
    [eEthereumNetwork.kovan]: '0x6606FF6624139a1599522Cf7B401b042Da43fA4f',
    [eEthereumNetwork.main]: '0xe635D0fb1608aA54C3ca99c497E887d2e1E3E690',
  },

  BNFTRegistry: {
    [eEthereumNetwork.coverage]: '',
    [eEthereumNetwork.hardhat]: '',
    [eEthereumNetwork.localhost]: '',
    [eEthereumNetwork.develop]: '0xf440346C93868879B5D3b8e5f96fEc57D4f2dcdf',
    [eEthereumNetwork.rinkeby]: '0xB873F088EB721261bc88BbC739B5C794e02e414b',
    [eEthereumNetwork.kovan]: '0xC5d1624B46db4F3F628400C0F41c49220c210c3F',
    [eEthereumNetwork.main]: '0x79d922DD382E42A156bC0A354861cDBC4F09110d',
  },
  BNFTRegistryOwner: {
    [eEthereumNetwork.coverage]: '',
    [eEthereumNetwork.hardhat]: '',
    [eEthereumNetwork.localhost]: '0xafF5C36642385b6c7Aaf7585eC785aB2316b5db6',
    [eEthereumNetwork.develop]: '0xad93fB0e59eC703422dD38dCb7AcB8e323C8cc5B',
    [eEthereumNetwork.rinkeby]: '0xafF5C36642385b6c7Aaf7585eC785aB2316b5db6',
    [eEthereumNetwork.kovan]: '0x249D0dF00d8ca96952A9fc29ddD3199bD035A05B',
    [eEthereumNetwork.main]: '',
  },

  CryptoPunksMarket: {
    [eEthereumNetwork.coverage]: '', // deployed in local evm
    [eEthereumNetwork.hardhat]: '', // deployed in local evm
    [eEthereumNetwork.localhost]: '',
    [eEthereumNetwork.develop]: '0xE159fC1226dbCe3e9d511e884a067D09C3290B9E',
    [eEthereumNetwork.rinkeby]: '0x6389eA3Cf6dE815ba76d7Cf4C6Db6A7093471bcb',
    [eEthereumNetwork.kovan]: '0xc667A10012209D8Fccc85aF7a913d8bBd26c18a7',
    [eEthereumNetwork.main]: '0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb',
  },
  WrappedPunkToken: {
    [eEthereumNetwork.coverage]: '', // deployed in local evm
    [eEthereumNetwork.hardhat]: '', // deployed in local evm
    [eEthereumNetwork.localhost]: '',
    [eEthereumNetwork.develop]: '0xcDbBC001976F79db2fC1ECfd140031fE970CeaEc',
    [eEthereumNetwork.rinkeby]: '0x74e4418A41169Fb951Ca886976ccd8b36968c4Ab',
    [eEthereumNetwork.kovan]: '0x8Ffc30191AdF56C3Bb06BD03A358fdBfA2C06f63',
    [eEthereumNetwork.main]: '0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6',
  },
  BoundPunkGateway: {
    [eEthereumNetwork.coverage]: '',
    [eEthereumNetwork.hardhat]: '',
    [eEthereumNetwork.localhost]: '',
    [eEthereumNetwork.develop]: '',
    [eEthereumNetwork.rinkeby]: '0xF482E6E29c0fe449b2A7326CDe850dcf8CE62e32',
    [eEthereumNetwork.kovan]: '',
    [eEthereumNetwork.main]: '',
  },

  NftsAssets: {
    [eEthereumNetwork.coverage]: {},
    [eEthereumNetwork.hardhat]: {},
    [eEthereumNetwork.localhost]: {},
    [eEthereumNetwork.main]: {},
    [eEthereumNetwork.rinkeby]: {},
    [eEthereumNetwork.kovan]: {},
    [eEthereumNetwork.develop]: {},
  },
};