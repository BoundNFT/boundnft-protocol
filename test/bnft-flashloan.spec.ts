import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockFlashLoanReceiver } from "../types/MockFlashLoanReceiver";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import { deployMockBNFTMinter, deployMockFlashLoanReceiver } from "../helpers/contracts-deployments";
import { waitForTx } from "../helpers/misc-utils";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";

const { expect } = require("chai");

makeSuite("BNFT: FlashLoan function", (testEnv: TestEnv) => {
  let _mockFlashLoanReceiver = {} as MockFlashLoanReceiver;
  let _mockBNFTMinter = {} as MockBNFTMinter;
  let user0TokenId1 = {} as string;
  let user0TokenId2 = {} as string;
  let user1TokenId1 = {} as string;

  before(async () => {
    const { bayc, bBAYC, bnftRegistry } = testEnv;

    _mockFlashLoanReceiver = await deployMockFlashLoanReceiver([bnftRegistry.address]);
    _mockBNFTMinter = await deployMockBNFTMinter([bayc.address, bBAYC.address]);
  });

  afterEach(async () => {
    await waitForTx(await _mockFlashLoanReceiver.clearAllSimulate());
  });

  it("Mints NFT into the BNFT", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await waitForTx(await bayc.connect(users[0].signer).setApprovalForAll(_mockBNFTMinter.address, true));
    await waitForTx(await bayc.connect(users[1].signer).setApprovalForAll(_mockBNFTMinter.address, true));

    testEnv.tokenIdTracker++;
    user0TokenId1 = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(users[0].signer).mint(user0TokenId1));
    await waitForTx(await _mockBNFTMinter.connect(users[0].signer).mint(users[0].address, user0TokenId1));

    testEnv.tokenIdTracker++;
    user0TokenId2 = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(users[0].signer).mint(user0TokenId2));
    await waitForTx(await _mockBNFTMinter.connect(users[0].signer).mint(users[0].address, user0TokenId2));

    testEnv.tokenIdTracker++;
    user1TokenId1 = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(users[1].signer).mint(user1TokenId1));
    await waitForTx(await _mockBNFTMinter.connect(users[1].signer).mint(users[1].address, user1TokenId1));
  });

  it("Takes flashloan using one token, returns the tokens correctly", async () => {
    const { users, bayc, bBAYC } = testEnv;

    const ownerBefore = await bayc.ownerOf(user0TokenId1);
    expect(ownerBefore).to.be.equal(bBAYC.address);
    const ownerBeforeB = await bBAYC.ownerOf(user0TokenId1);
    expect(ownerBeforeB).to.be.equal(users[0].address);

    await waitForTx(
      await bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], [])
    );

    const ownerAfter = await bayc.ownerOf(user0TokenId1);
    expect(ownerAfter).to.be.equal(bBAYC.address);
    const ownerAfterB = await bBAYC.ownerOf(user0TokenId1);
    expect(ownerAfterB).to.be.equal(users[0].address);
  });

  it("Takes flashloan using many tokens, returns the tokens correctly", async () => {
    const { users, bayc, bBAYC } = testEnv;

    const ownerBefore1 = await bayc.ownerOf(user0TokenId1);
    expect(ownerBefore1).to.be.equal(bBAYC.address);
    const ownerBeforeB1 = await bBAYC.ownerOf(user0TokenId1);
    expect(ownerBeforeB1).to.be.equal(users[0].address);

    const ownerBefore2 = await bayc.ownerOf(user0TokenId2);
    expect(ownerBefore2).to.be.equal(bBAYC.address);
    const ownerBeforeB2 = await bBAYC.ownerOf(user0TokenId2);
    expect(ownerBeforeB2).to.be.equal(users[0].address);

    await waitForTx(
      await bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1, user0TokenId2], [])
    );

    const ownerAfter1 = await bayc.ownerOf(user0TokenId1);
    expect(ownerAfter1).to.be.equal(bBAYC.address);
    const ownerAfterB1 = await bBAYC.ownerOf(user0TokenId1);
    expect(ownerAfterB1).to.be.equal(users[0].address);

    const ownerAfter2 = await bayc.ownerOf(user0TokenId2);
    expect(ownerAfter2).to.be.equal(bBAYC.address);
    const ownerAfterB2 = await bBAYC.ownerOf(user0TokenId2);
    expect(ownerAfterB2).to.be.equal(users[0].address);
  });

  it("Takes flashloan, does not return all the tokens. (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await waitForTx(await _mockFlashLoanReceiver.setTokenIdNotToApprove(user0TokenId1));

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], [])
    ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
  });

  it("Takes flashloan, does not return partly the tokens. (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await waitForTx(await _mockFlashLoanReceiver.setTokenIdNotToApprove(user0TokenId2));

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1, user0TokenId2], [])
    ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
  });

  it("Tries to take a flashloan using not owned tokens (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user1TokenId1], [])
    ).to.be.revertedWith("BNFT: caller is not owner");
  });

  it("Takes flashloan, simulating receiver execution failed (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await _mockFlashLoanReceiver.setFailExecution(true);

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], [])
    ).to.be.revertedWith("BNFT: invalid flashloan executor return");
  });

  it("tries to take a flashloan using non contract address as receiver (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await expect(bBAYC.connect(users[0].signer).flashLoan(users[1].address, [user0TokenId1], [])).to.be.revertedWith(
      ""
    );
  });

  it("Tries to take a flashloan reentry BNFT contract mint (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await _mockFlashLoanReceiver.setSimulateCallBNFT(1, 0);

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], [])
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });

  it("Tries to take a flashloan reentry BNFT burn (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await _mockFlashLoanReceiver.setSimulateCallBNFT(2, 0);

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], [])
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });

  it("Tries to take a flashloan reentry BNFT flashloan with mode 3 (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await _mockFlashLoanReceiver.setSimulateCallBNFT(3, user0TokenId1);

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], [])
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });

  it("Tries to take a flashloan reentry BNFT flashloan with mode 4 (revert expected)", async () => {
    const { users, bayc, bBAYC } = testEnv;

    await _mockFlashLoanReceiver.setSimulateCallBNFT(4, user0TokenId2);

    await expect(
      bBAYC.connect(users[0].signer).flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], [])
    ).to.be.revertedWith("ReentrancyGuard: reentrant call");
  });

  it("Tries to take a flashloan by authorized aucontract", async () => {
    const { users, bayc, bBAYC } = testEnv;

    const bnftOwnerAddr = await bBAYC.owner();
    const bnftOwnerSigner = await getEthersSignerByAddress(bnftOwnerAddr);

    await waitForTx(
      await bBAYC.connect(bnftOwnerSigner).setAuthorizedFlashLoanCallers([_mockBNFTMinter.address], true)
    );
    const callerFlag = await bBAYC.authorizedFlashLoanCallers(_mockBNFTMinter.address);
    expect(callerFlag).to.be.equal(true);

    await waitForTx(await _mockBNFTMinter.flashLoan(_mockFlashLoanReceiver.address, [user0TokenId1], []));
  });
});
