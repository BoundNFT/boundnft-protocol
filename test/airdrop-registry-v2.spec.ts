import { TestEnv, makeSuite } from "./helpers/make-suite";
import { deployUserFlashclaimRegistry, deployUserFlashclaimRegistryV2 } from "../helpers/contracts-deployments";
import { UserFlashclaimRegistry, UserFlashclaimRegistryV2 } from "../types";
import { getAirdropFlashLoanReceiver, getAirdropFlashLoanReceiverV2 } from "../helpers/contracts-getters";
import { ethers } from "ethers";
import { waitForTx } from "../helpers/misc-utils";
import { ZERO_ADDRESS } from "../helpers/constants";

const { expect } = require("chai");

makeSuite("Airdrop: Registry V2", (testEnv: TestEnv) => {
  let _flashClaimRegistryV1 = {} as UserFlashclaimRegistry;
  let _flashClaimRegistryV2 = {} as UserFlashclaimRegistryV2;

  before(async () => {
    const { bnftRegistry } = testEnv;

    _flashClaimRegistryV1 = await deployUserFlashclaimRegistry([bnftRegistry.address]);

    _flashClaimRegistryV2 = await deployUserFlashclaimRegistryV2([bnftRegistry.address, _flashClaimRegistryV1.address]);
  });

  afterEach(async () => {});

  it("User 1 tries to create V1 receiver at first time.", async () => {
    const user1 = testEnv.users[1];

    await waitForTx(await _flashClaimRegistryV1.connect(user1.signer).createReceiver());

    const receiverV1Address = await _flashClaimRegistryV1.userReceivers(user1.address);
    expect(receiverV1Address).to.be.not.equal(undefined);
    expect(receiverV1Address).to.be.not.equal(ZERO_ADDRESS);

    const receiverV1Contract = await getAirdropFlashLoanReceiver(receiverV1Address);
    expect(await receiverV1Contract.owner()).to.be.equal(user1.address);

    const receiverAddress = await _flashClaimRegistryV2.userReceivers(user1.address);
    expect(receiverAddress).to.be.equal(receiverV1Address);
  });

  it("User 1 tries to create V2 receiver but already has V1 receiver. (revert expected)", async () => {
    const user1 = testEnv.users[1];

    await expect(_flashClaimRegistryV2.connect(user1.signer).createReceiver()).to.be.revertedWith(
      "user already has a V1 receiver"
    );

    const receiverV2Address = await _flashClaimRegistryV2.userReceiversV2(user1.address);
    expect(receiverV2Address).to.be.equal(ZERO_ADDRESS);
  });

  it("User 2 tries to create V2 receiver at first time.", async () => {
    const user2 = testEnv.users[2];

    await waitForTx(await _flashClaimRegistryV2.connect(user2.signer).createReceiver());

    const receiverV2Address = await _flashClaimRegistryV2.userReceiversV2(user2.address);
    expect(receiverV2Address).to.be.not.equal(undefined);
    expect(receiverV2Address).to.be.not.equal(ZERO_ADDRESS);

    const receiverV1Contract = await getAirdropFlashLoanReceiverV2(receiverV2Address);
    expect(await receiverV1Contract.owner()).to.be.equal(user2.address);

    const receiverAddress = await _flashClaimRegistryV2.userReceivers(user2.address);
    expect(receiverAddress).to.be.equal(receiverV2Address);
  });

  it("User 2 tries to create V2 receiver but already has V2 receiver. (revert expected)", async () => {
    const user2 = testEnv.users[2];

    await expect(_flashClaimRegistryV2.connect(user2.signer).createReceiver()).to.be.revertedWith(
      "user already has a V2 receiver"
    );
  });
});
