import { makeSuite } from "./helpers/make-suite";

import { waitForTx } from "../helpers/misc-utils";

const { expect } = require("chai");

makeSuite("Subgraph tests", async (testEnv) => {
  it("mint-burn", async () => {
    const { users } = testEnv;
    const user0 = users[0];
    const user1 = users[1];
  });
});
