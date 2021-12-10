import { tEthereumAddress } from "./types";
import { MockNftMap } from "./contracts-helpers";

export const getAllNftAddresses = (mockNfts: MockNftMap) =>
  Object.entries(mockNfts).reduce(
    (accum: { [tokenSymbol: string]: tEthereumAddress }, [tokenSymbol, tokenContract]) => ({
      ...accum,
      [tokenSymbol]: tokenContract.address,
    }),
    {}
  );

