import { IBendConfiguration, eEthereumNetwork } from '../helpers/types';

import { CommonsConfig } from './commons';

// ----------------
// POOL--SPECIFIC PARAMS
// ----------------

export const BendConfig: IBendConfiguration = {
  ...CommonsConfig,
  NftsAssets: {
    [eEthereumNetwork.hardhat]: {},
    [eEthereumNetwork.coverage]: {},
    [eEthereumNetwork.rinkeby]: {
      WPUNKS: '0x5b4FaC380a2A79EE0ddA713a31cbA7A74Cba7Cd0',
      BAYC: '0x6b81840bc2E607C1Ea099D7BD93957608CEB3947',
    },
    [eEthereumNetwork.main]: {
      WPUNKS: '0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6',
      BAYC: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
    },
  },
};

export default BendConfig;
