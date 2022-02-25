import BigNumber from "bignumber.js";

// ----------------
// MATH
// ----------------

export const oneEther = new BigNumber(Math.pow(10, 18));
export const MAX_UINT_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
export const ONE_YEAR = "31536000";
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ONE_ADDRESS = "0x0000000000000000000000000000000000000001";

export const MOCK_NFT_BASE_URIS = {
  WPUNKS: "https://wrappedpunks.com:3000/api/punks/metadata/",
  BAYC: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/",
  DOODLE: "ipfs://QmPMc4tcBsMqLRuCQtPmPe84bpSjrC3Ky7t3JWuHXYB4aS/",
  COOL: "https://api.coolcatsnft.com/cat/",
  MEEBITS: "https://meebits.larvalabs.com/meebit/1",
  MAYC: "https://boredapeyachtclub.com/api/mutants/",
  WOW: "https://wow-prod-nftribe.s3.eu-west-2.amazonaws.com/t/",
  CLONEX: "https://clonex-assets.rtfkt.com/",
  AZUKI: "https://ikzttp.mypinata.cloud/ipfs/QmQFkLSQysj94s5GvTHPyzTxrawwtjgiiYS2TBLgrvw8CW/",
  KONGZ: "https://kongz.herokuapp.com/api/metadata/",
};
