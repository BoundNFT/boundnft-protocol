import { TestEnv, makeSuite } from "./helpers/make-suite";
import { deployMockAirdrop, deployUserFlashclaimRegistryV3 } from "../helpers/contracts-deployments";
import {
  AirdropFlashLoanReceiverV3,
  AirdropFlashLoanReceiverV3Factory,
  MockAirdropProject,
  MockLendPoolLoan,
  MockLendPoolLoanFactory,
  MockStakeManager,
  MockStakeManagerFactory,
  UserFlashclaimRegistryV3,
} from "../types";
import { getAirdropFlashLoanReceiverV3, getMintableERC20, getMintableERC721 } from "../helpers/contracts-getters";
import { advanceTimeAndBlock, waitForTx } from "../helpers/misc-utils";
import { ZERO_ADDRESS } from "../helpers/constants";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";

const { expect } = require("chai");

makeSuite("Airdrop: Registry V3", (testEnv: TestEnv) => {
  let _flashClaimRegistryV3 = {} as UserFlashclaimRegistryV3;
  let _mockLendPoolLoan = {} as MockLendPoolLoan;
  let _mockStakeManager = {} as MockStakeManager;
  let _mockReceiverV3Impl = {} as AirdropFlashLoanReceiverV3;

  let _mockAirdropProject1 = {} as MockAirdropProject;
  let _mockAirdropProject2 = {} as MockAirdropProject;

  before(async () => {
    const { bnftRegistry, bayc, bBAYC } = testEnv;

    _mockLendPoolLoan = await new MockLendPoolLoanFactory(testEnv.deployer.signer).deploy(bnftRegistry.address);
    _mockStakeManager = await new MockStakeManagerFactory(testEnv.deployer.signer).deploy(bnftRegistry.address);
    _mockReceiverV3Impl = await new AirdropFlashLoanReceiverV3Factory(testEnv.deployer.signer).deploy();
    _flashClaimRegistryV3 = await deployUserFlashclaimRegistryV3();
    await waitForTx(
      await _flashClaimRegistryV3.initialize(
        bnftRegistry.address,
        _mockLendPoolLoan.address,
        _mockStakeManager.address,
        _mockReceiverV3Impl.address
      )
    );

    _mockAirdropProject1 = await deployMockAirdrop([bnftRegistry.address]);
    _mockAirdropProject2 = await deployMockAirdrop([bnftRegistry.address]);
  });

  afterEach(async () => {});

  it("User 2 tries to create V3 receiver at first time.", async () => {
    const user2 = testEnv.users[2];

    await waitForTx(await _flashClaimRegistryV3.connect(user2.signer).createReceiver());

    const receiverV3Address = await _flashClaimRegistryV3.userReceiversV3(user2.address);
    expect(receiverV3Address).to.be.not.equal(undefined);
    expect(receiverV3Address).to.be.not.equal(ZERO_ADDRESS);

    const receiverV3Contract = await getAirdropFlashLoanReceiverV3(receiverV3Address);
    expect(await receiverV3Contract.owner()).to.be.equal(user2.address);

    const receiverAddress = await _flashClaimRegistryV3.getUserReceiver(user2.address);
    expect(receiverAddress).to.be.equal(receiverV3Address);

    const lastVersionReceiver = await _flashClaimRegistryV3.getUserReceiverLatestVersion(user2.address);
    expect(lastVersionReceiver[0]).to.be.equal(await _flashClaimRegistryV3.VERSION());
    expect(lastVersionReceiver[1]).to.be.equal(receiverV3Address);

    const allVersionReceivers = await _flashClaimRegistryV3.getUserReceiverAllVersions(user2.address);
    expect(allVersionReceivers[0][0]).to.be.equal(await _flashClaimRegistryV3.VERSION());
    expect(allVersionReceivers[1][0]).to.be.equal(receiverV3Address);
  });

  it("User 2 tries to create V3 receiver but already has V3 receiver. (revert expected)", async () => {
    const user2 = testEnv.users[2];

    await expect(_flashClaimRegistryV3.connect(user2.signer).createReceiver()).to.be.revertedWith(
      "user already has a receiver"
    );
  });

  it("Prepare user receiver and Maintain Airdrop Whitelist", async () => {
    const { users, bayc, bBAYC } = testEnv;
    const user3 = users[3];
    const user4 = users[4];
    const user5 = users[5];

    const ownerAddress = await _flashClaimRegistryV3.owner();
    const ownerSigner = await getEthersSignerByAddress(ownerAddress);

    await waitForTx(await _flashClaimRegistryV3.connect(user3.signer).createReceiver());
    await waitForTx(await _flashClaimRegistryV3.connect(user4.signer).createReceiver());
    await waitForTx(await _flashClaimRegistryV3.connect(user5.signer).createReceiver());

    await _flashClaimRegistryV3.connect(ownerSigner).setAirdropContractWhiteList(_mockAirdropProject1.address, true);
  });

  it("User 2 tries to flash loan with invalid airdrop contract. (revert expected)", async () => {
    const { users, bayc } = testEnv;
    const user2 = users[2];
    const user5 = users[5];

    await waitForTx(await bayc.connect(user2.signer).setApprovalForAll(_mockLendPoolLoan.address, true));
    testEnv.tokenIdTracker++;
    const tokenId = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(user2.signer).mint(tokenId));
    await waitForTx(await _mockLendPoolLoan.connect(user2.signer).createLoan(bayc.address, user2.address, tokenId));

    const applyAirdropEncodedData = _mockAirdropProject1.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const user2ReceiverAddress = await _flashClaimRegistryV3.getUserReceiver(user2.address);
    const user2Receiver = await getAirdropFlashLoanReceiverV3(user2ReceiverAddress);

    const receiverEncodedData = await user2Receiver.encodeFlashLoanParams(
      [1],
      [await _mockAirdropProject1.erc20Token()],
      [0],
      _mockAirdropProject2.address,
      applyAirdropEncodedData,
      0
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    await expect(
      _flashClaimRegistryV3.connect(user2.signer).flashLoan(bayc.address, [tokenId], receiverEncodedData)
    ).to.be.revertedWith("invalid airdrop contract");
  });

  it("User 3 tries to flash loan with invalid token owner. (revert expected)", async () => {
    const { users, bayc } = testEnv;
    const user2 = users[2];
    const user3 = users[3];

    await waitForTx(await bayc.connect(user2.signer).setApprovalForAll(_mockLendPoolLoan.address, true));
    testEnv.tokenIdTracker++;
    const tokenId = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(user2.signer).mint(tokenId));
    await waitForTx(await _mockLendPoolLoan.connect(user2.signer).createLoan(bayc.address, user2.address, tokenId));

    const applyAirdropEncodedData = _mockAirdropProject1.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const user2ReceiverAddress = await _flashClaimRegistryV3.getUserReceiver(user2.address);
    const user2Receiver = await getAirdropFlashLoanReceiverV3(user2ReceiverAddress);

    const receiverEncodedData = await user2Receiver.encodeFlashLoanParams(
      [1],
      [await _mockAirdropProject1.erc20Token()],
      [0],
      _mockAirdropProject1.address,
      applyAirdropEncodedData,
      0
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    await expect(
      _flashClaimRegistryV3.connect(user3.signer).flashLoan(bayc.address, [tokenId], receiverEncodedData)
    ).to.be.revertedWith("invalid token owner");
  });

  it("User 2 tries to flash loan with nft not locked. (revert expected)", async () => {
    const { users, bayc } = testEnv;
    const user2 = users[2];

    await waitForTx(await bayc.connect(user2.signer).setApprovalForAll(_mockLendPoolLoan.address, true));
    testEnv.tokenIdTracker++;
    const tokenId = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(user2.signer).mint(tokenId));
    await waitForTx(await _mockLendPoolLoan.connect(user2.signer).createLoan(bayc.address, user2.address, tokenId));

    const applyAirdropEncodedData = _mockAirdropProject1.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const user2ReceiverAddress = await _flashClaimRegistryV3.getUserReceiver(user2.address);
    const user2Receiver = await getAirdropFlashLoanReceiverV3(user2ReceiverAddress);

    const receiverEncodedData = await user2Receiver.encodeFlashLoanParams(
      [1],
      [await _mockAirdropProject1.erc20Token()],
      [0],
      _mockAirdropProject1.address,
      applyAirdropEncodedData,
      0
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    await expect(
      _flashClaimRegistryV3.connect(user2.signer).flashLoan(bayc.address, [tokenId], receiverEncodedData)
    ).to.be.revertedWith("flash loan not locked");
  });

  it("User 2 tries to flash loan with valid airdrop contract. (LendPoolLoan)", async () => {
    const { users, bayc } = testEnv;
    const user2 = users[2];

    await waitForTx(await bayc.connect(user2.signer).setApprovalForAll(_mockLendPoolLoan.address, true));

    testEnv.tokenIdTracker++;
    const tokenId = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(user2.signer).mint(tokenId));
    await waitForTx(await _mockLendPoolLoan.connect(user2.signer).createLoan(bayc.address, user2.address, tokenId));

    await waitForTx(await _mockLendPoolLoan.connect(user2.signer).setFlashLoanLocking(bayc.address, tokenId, true));

    const mockAirdropERC20Token = await getMintableERC20(await _mockAirdropProject1.erc20Token());
    const erc20Bonus = await _mockAirdropProject1.erc20Bonus();

    const applyAirdropEncodedData = _mockAirdropProject1.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const user2ReceiverAddress = await _flashClaimRegistryV3.getUserReceiver(user2.address);
    const user2Receiver = await getAirdropFlashLoanReceiverV3(user2ReceiverAddress);

    const receiverEncodedData = await user2Receiver.encodeFlashLoanParams(
      [1],
      [mockAirdropERC20Token.address],
      [0],
      _mockAirdropProject1.address,
      applyAirdropEncodedData,
      0
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    const erc20BalanceBefore = await mockAirdropERC20Token.balanceOf(user2.address);

    await waitForTx(
      await _flashClaimRegistryV3.connect(user2.signer).flashLoan(bayc.address, [tokenId], receiverEncodedData)
    );

    const erc20BalanceAfter = await mockAirdropERC20Token.balanceOf(user2.address);
    expect(erc20BalanceAfter).to.be.equal(erc20Bonus.add(erc20BalanceBefore));
  });

  it("User 3 tries to flash loan with valid airdrop contract. (StakeManager)", async () => {
    const { users, bayc } = testEnv;
    const user3 = users[3];

    await waitForTx(await bayc.connect(user3.signer).setApprovalForAll(_mockStakeManager.address, true));

    testEnv.tokenIdTracker++;
    const tokenId = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(user3.signer).mint(tokenId));
    await waitForTx(await _mockStakeManager.connect(user3.signer).stake(bayc.address, user3.address, tokenId));

    await waitForTx(await _mockStakeManager.connect(user3.signer).setFlashLoanLocking(bayc.address, tokenId, true));

    const mockAirdropERC721Token = await getMintableERC721(await _mockAirdropProject1.erc721Token());
    const erc721Bonus = await _mockAirdropProject1.erc721Bonus();

    const applyAirdropEncodedData = _mockAirdropProject1.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const user3ReceiverAddress = await _flashClaimRegistryV3.getUserReceiver(user3.address);
    const user3Receiver = await getAirdropFlashLoanReceiverV3(user3ReceiverAddress);

    const receiverEncodedData = await user3Receiver.encodeFlashLoanParams(
      [2],
      [mockAirdropERC721Token.address],
      [0],
      _mockAirdropProject1.address,
      applyAirdropEncodedData,
      0
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    const erc721BalanceBefore = await mockAirdropERC721Token.balanceOf(user3.address);

    await waitForTx(
      await _flashClaimRegistryV3.connect(user3.signer).flashLoan(bayc.address, [tokenId], receiverEncodedData)
    );

    const erc721BalanceAfter = await mockAirdropERC721Token.balanceOf(user3.address);
    console.log(erc721BalanceBefore, erc721BalanceAfter, erc721Bonus);
    expect(erc721BalanceAfter).to.be.equal(erc721Bonus.add(erc721BalanceBefore));
  });
});
