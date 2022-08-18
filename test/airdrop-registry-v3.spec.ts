import { TestEnv, makeSuite } from "./helpers/make-suite";
import {
  deployUserFlashclaimRegistry,
  deployUserFlashclaimRegistryV2,
  deployUserFlashclaimRegistryV3,
} from "../helpers/contracts-deployments";
import { UserFlashclaimRegistry, UserFlashclaimRegistryV2, UserFlashclaimRegistryV3 } from "../types";
import {
  getAirdropFlashLoanReceiver,
  getAirdropFlashLoanReceiverV2,
  getAirdropFlashLoanReceiverV3,
} from "../helpers/contracts-getters";
import { ethers } from "ethers";
import { advanceTimeAndBlock, waitForTx } from "../helpers/misc-utils";
import { ZERO_ADDRESS } from "../helpers/constants";

const { expect } = require("chai");

makeSuite("Airdrop: Registry V3", (testEnv: TestEnv) => {
  let _flashClaimRegistryV1 = {} as UserFlashclaimRegistry;
  let _flashClaimRegistryV2 = {} as UserFlashclaimRegistryV2;
  let _flashClaimRegistryV3 = {} as UserFlashclaimRegistryV3;

  before(async () => {
    const { bnftRegistry } = testEnv;

    _flashClaimRegistryV1 = await deployUserFlashclaimRegistry([bnftRegistry.address]);

    _flashClaimRegistryV2 = await deployUserFlashclaimRegistryV2([bnftRegistry.address, _flashClaimRegistryV1.address]);

    _flashClaimRegistryV3 = await deployUserFlashclaimRegistryV3([bnftRegistry.address, _flashClaimRegistryV2.address]);
  });

  afterEach(async () => {});

  it("User 1 tries to create V2 receiver at first time.", async () => {
    const user1 = testEnv.users[1];

    await waitForTx(await _flashClaimRegistryV2.connect(user1.signer).createReceiver());

    const receiverV2Address = await _flashClaimRegistryV2.userReceivers(user1.address);
    expect(receiverV2Address).to.be.not.equal(undefined);
    expect(receiverV2Address).to.be.not.equal(ZERO_ADDRESS);

    const receiverV2Contract = await getAirdropFlashLoanReceiverV2(receiverV2Address);
    expect(await receiverV2Contract.owner()).to.be.equal(user1.address);

    const receiverAddress = await _flashClaimRegistryV3.userReceivers(user1.address);
    expect(receiverAddress).to.be.equal(receiverV2Address);

    const receiverLatestVersion = await _flashClaimRegistryV3.getUserReceiverLatestVersion(user1.address);
    expect(receiverLatestVersion[0]).to.be.equal(2);
    expect(receiverLatestVersion[1]).to.be.equal(receiverAddress);
  });

  it("User 1 tries to create V3 receiver but already has V2 receiver. (revert expected)", async () => {
    const user1 = testEnv.users[1];

    const receiverAddressBefore = await _flashClaimRegistryV3.userReceivers(user1.address);

    await expect(_flashClaimRegistryV3.connect(user1.signer).createReceiver()).to.be.revertedWith(
      "user already has a old version receiver"
    );

    const receiverAddressAfter = await _flashClaimRegistryV3.userReceivers(user1.address);
    expect(receiverAddressAfter).to.be.equal(receiverAddressBefore);

    const receiverV3Address = await _flashClaimRegistryV3.userReceiversV3(user1.address);
    expect(receiverV3Address).to.be.equal(ZERO_ADDRESS);
  });

  it("User 1 tries to force create V3 receiver even already has V2 receiver.", async () => {
    const user1 = testEnv.users[1];

    const receiverAddressBefore = await _flashClaimRegistryV3.userReceivers(user1.address);

    await waitForTx(await _flashClaimRegistryV3.connect(user1.signer).forceCreateReceiver());

    const receiverAddressAfter = await _flashClaimRegistryV3.userReceivers(user1.address);
    expect(receiverAddressAfter).to.be.not.equal(receiverAddressBefore);

    const receiverV3Address = await _flashClaimRegistryV3.userReceiversV3(user1.address);
    expect(receiverV3Address).to.be.not.equal(undefined);
    expect(receiverV3Address).to.be.not.equal(ZERO_ADDRESS);

    const receiverV3Contract = await getAirdropFlashLoanReceiverV3(receiverV3Address);
    expect(await receiverV3Contract.owner()).to.be.equal(user1.address);

    const receiverLatestVersion = await _flashClaimRegistryV3.getUserReceiverLatestVersion(user1.address);
    expect(receiverLatestVersion[0]).to.be.equal(3);
    expect(receiverLatestVersion[1]).to.be.equal(receiverV3Address);

    const receiverAllVersions = await _flashClaimRegistryV3.getUserReceiverAllVersions(user1.address);
    expect(receiverAllVersions[0].length).to.be.equal(2);

    expect(receiverAllVersions[0][0]).to.be.equal(3);
    expect(receiverAllVersions[1][0]).to.be.equal(receiverV3Address);

    expect(receiverAllVersions[0][1]).to.be.equal(2);
    const receiverV2Address = await _flashClaimRegistryV2.userReceivers(user1.address);
    expect(receiverAllVersions[1][1]).to.be.equal(receiverV2Address);
  });

  it("User 2 tries to create V3 receiver at first time.", async () => {
    const user2 = testEnv.users[2];

    await waitForTx(await _flashClaimRegistryV3.connect(user2.signer).createReceiver());

    const receiverV3Address = await _flashClaimRegistryV3.userReceiversV3(user2.address);
    expect(receiverV3Address).to.be.not.equal(undefined);
    expect(receiverV3Address).to.be.not.equal(ZERO_ADDRESS);

    const receiverV3Contract = await getAirdropFlashLoanReceiverV3(receiverV3Address);
    expect(await receiverV3Contract.owner()).to.be.equal(user2.address);

    const receiverAddress = await _flashClaimRegistryV3.userReceivers(user2.address);
    expect(receiverAddress).to.be.equal(receiverV3Address);
  });

  it("User 2 tries to create V3 receiver but already has V3 receiver. (revert expected)", async () => {
    const user2 = testEnv.users[2];

    await expect(_flashClaimRegistryV3.connect(user2.signer).createReceiver()).to.be.revertedWith(
      "user already has a V3 receiver"
    );
  });

  it("User 2 tries to force create V3 receiver but already has V3 receiver. (revert expected)", async () => {
    const user2 = testEnv.users[2];

    await expect(_flashClaimRegistryV3.connect(user2.signer).forceCreateReceiver()).to.be.revertedWith(
      "user already has a V3 receiver"
    );
  });

  it("User 3 tries to force create V3 receiver even don't has V3 receiver.", async () => {
    const user3 = testEnv.users[3];

    await waitForTx(await _flashClaimRegistryV3.connect(user3.signer).forceCreateReceiver());

    const receiverV3Address = await _flashClaimRegistryV3.userReceiversV3(user3.address);
    expect(receiverV3Address).to.be.not.equal(undefined);
    expect(receiverV3Address).to.be.not.equal(ZERO_ADDRESS);

    const receiverV3Contract = await getAirdropFlashLoanReceiverV3(receiverV3Address);
    expect(await receiverV3Contract.owner()).to.be.equal(user3.address);

    const receiverAddress = await _flashClaimRegistryV3.userReceivers(user3.address);
    expect(receiverAddress).to.be.equal(receiverV3Address);
  });
});
