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
    [eEthereumNetwork.localhost]: {
      WPUNKS: '0xB4B4ead1A260F1572b88b9D8ABa5A152D166c104',
      BAYC: '0xa05ffF82bcC0C599984b0839218DC6ee9328d1Fb',
      DOODLE: '0x025FE4760c6f14dE878C22cEb09A3235F16dAe53',
      COOL: '0xb2f97A3c2E48cd368901657e31Faaa93035CE390',
      MEEBITS: '0x5a60c5d89A0A0e08ae0CAe73453e3AcC9C335847',
      MAYC: '0x4e07D87De1CF586D51C3665e6a4d36eB9d99a457',
    },
    [eEthereumNetwork.rinkeby]: {
      WPUNKS: '0x5b4FaC380a2A79EE0ddA713a31cbA7A74Cba7Cd0',
      BAYC: '0x6b81840bc2E607C1Ea099D7BD93957608CEB3947',
      DOODLE: '0x7b5f4f9fb286a77A57127FEfE01E36155164D718',
      COOL: '0xf976e5355d10F90c189c5527abc4F89EE8967A95',
      MEEBITS: '0x84BBb2a522D71DffAeea24B582Ef6d7AfA8aE9a1',
      MAYC: '0x4a0e0813F88b25e8e740fbaa268a1Cd487126c9d',
    },
    [eEthereumNetwork.main]: {
      WPUNKS: '0xb7F7F6C52F2e2fdb1963Eab30438024864c313F6',
      BAYC: '0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d',
      DOODLE: '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e',
      COOL: '0x1A92f7381B9F03921564a437210bB9396471050C',
      MEEBITS: '0x7Bd29408f11D2bFC23c34f18275bBf23bB716Bc7',
      MAYC: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6',
    },
  },
};

export default BendConfig;
