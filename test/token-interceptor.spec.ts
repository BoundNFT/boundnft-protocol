import { expect } from "chai";
import { makeSuite, TestEnv } from "./helpers/make-suite";
import { waitForTx } from "../helpers/misc-utils";
import { MockBNFTMinter, MockBNFTMinterFactory, MockTokenInterceptor, MockTokenInterceptorFactory } from "../types";

makeSuite("BNFT: Token Interceptor", (testEnv: TestEnv) => {
  let _mockBNFTMinter1: MockBNFTMinter;
  let _mockBNFTMinter2: MockBNFTMinter;
  let _mockTokenInterceptor1: MockTokenInterceptor;
  let _mockTokenInterceptor2: MockTokenInterceptor;
  let _user0TokenId1: string;

  before("Before: set config", async () => {
    const { deployer, users, bayc, bBAYC } = testEnv;

    _mockBNFTMinter1 = await new MockBNFTMinterFactory(deployer.signer).deploy(bayc.address, bBAYC.address);
    _mockBNFTMinter2 = await new MockBNFTMinterFactory(deployer.signer).deploy(bayc.address, bBAYC.address);
    _mockTokenInterceptor1 = await new MockTokenInterceptorFactory(deployer.signer).deploy();
    _mockTokenInterceptor2 = await new MockTokenInterceptorFactory(deployer.signer).deploy();

    await waitForTx(await bayc.connect(users[0].signer).setApprovalForAll(_mockBNFTMinter1.address, true));
    await waitForTx(await bayc.connect(users[0].signer).setApprovalForAll(_mockBNFTMinter2.address, true));

    testEnv.tokenIdTracker++;
    _user0TokenId1 = testEnv.tokenIdTracker.toString();
    await waitForTx(await bayc.connect(users[0].signer).mint(_user0TokenId1));
  });

  afterEach("After: set config", async () => {
    await waitForTx(await _mockTokenInterceptor1.resetCallState());
    await waitForTx(await _mockTokenInterceptor2.resetCallState());
  });

  it("Single Interceptor add and delete some tokens", async () => {
    const { bBAYC } = testEnv;

    await waitForTx(await _mockBNFTMinter1.addTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    const checkInterceptors1 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors1.length).eq(1);
    expect(checkInterceptors1[0]).eq(_mockTokenInterceptor1.address);

    await waitForTx(await _mockBNFTMinter1.deleteTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    const checkInterceptors2 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors2.length).eq(0);
  });

  it("Multiple Interceptors add and delete some tokens", async () => {
    const { bBAYC } = testEnv;

    await waitForTx(await _mockBNFTMinter1.addTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    const checkInterceptors1 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors1.length).eq(1);
    expect(checkInterceptors1[0]).eq(_mockTokenInterceptor1.address);

    await waitForTx(await _mockBNFTMinter1.addTokenInterceptor(_user0TokenId1, _mockTokenInterceptor2.address));
    const checkInterceptors2 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors2.length).eq(2);
    expect(checkInterceptors2[1]).eq(_mockTokenInterceptor2.address);

    await waitForTx(await _mockBNFTMinter1.deleteTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    const checkInterceptors3 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors3.length).eq(1);
    expect(checkInterceptors3[0]).eq(_mockTokenInterceptor2.address);

    await waitForTx(await _mockBNFTMinter1.deleteTokenInterceptor(_user0TokenId1, _mockTokenInterceptor2.address));
    const checkInterceptors4 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors4.length).eq(0);
  });

  it("Single interceptor has been called when mint and burn", async () => {
    const { users, bBAYC } = testEnv;

    // minter 1, interceptor 1
    await waitForTx(await _mockBNFTMinter1.addTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    const checkInterceptors1 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors1.length).eq(1);
    expect(checkInterceptors1[0]).eq(_mockTokenInterceptor1.address);

    // minter 2, interceptor 2
    await waitForTx(await _mockBNFTMinter2.addTokenInterceptor(_user0TokenId1, _mockTokenInterceptor2.address));

    // mint & burn
    await waitForTx(await _mockBNFTMinter1.connect(users[0].signer).mint(users[0].address, _user0TokenId1));

    await waitForTx(await _mockBNFTMinter1.connect(users[0].signer).burn(_user0TokenId1));

    // minter 1, interceptor 1 should be called
    const checkMintCalled1 = await _mockTokenInterceptor1.isPreHandleMintCalled();
    expect(checkMintCalled1).eq(true);

    const checkBurnCalled1 = await _mockTokenInterceptor1.isPreHandleBurnCalled();
    expect(checkBurnCalled1).eq(true);

    // minter 2, interceptor 2 should not be called
    const checkMintCalled2 = await _mockTokenInterceptor2.isPreHandleMintCalled();
    expect(checkMintCalled2).eq(false);

    const checkBurnCalled2 = await _mockTokenInterceptor2.isPreHandleBurnCalled();
    expect(checkBurnCalled2).eq(false);

    await waitForTx(await _mockBNFTMinter1.deleteTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    await waitForTx(await _mockBNFTMinter2.deleteTokenInterceptor(_user0TokenId1, _mockTokenInterceptor2.address));
  });

  it("Multiple interceptors has been called when mint and burn", async () => {
    const { users, bBAYC } = testEnv;

    // minter 1, interceptor 1
    await waitForTx(await _mockBNFTMinter1.addTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    const checkInterceptors1 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors1.length).eq(1);
    expect(checkInterceptors1[0]).eq(_mockTokenInterceptor1.address);

    // minter 1, interceptor 2
    await waitForTx(await _mockBNFTMinter1.addTokenInterceptor(_user0TokenId1, _mockTokenInterceptor2.address));
    const checkInterceptors2 = await bBAYC.getTokenInterceptors(_mockBNFTMinter1.address, _user0TokenId1);
    expect(checkInterceptors2.length).eq(2);
    expect(checkInterceptors2[1]).eq(_mockTokenInterceptor2.address);

    await waitForTx(await _mockBNFTMinter1.connect(users[0].signer).mint(users[0].address, _user0TokenId1));

    await waitForTx(await _mockBNFTMinter1.connect(users[0].signer).burn(_user0TokenId1));

    // minter 1, interceptor 1 will be called
    const checkMintCalled1 = await _mockTokenInterceptor1.isPreHandleMintCalled();
    expect(checkMintCalled1).eq(true);

    const checkBurnCalled1 = await _mockTokenInterceptor1.isPreHandleMintCalled();
    expect(checkBurnCalled1).eq(true);

    // minter 1, interceptor 2 will be called
    const checkMintCalled2 = await _mockTokenInterceptor2.isPreHandleMintCalled();
    expect(checkMintCalled2).eq(true);

    const checkBurnCalled2 = await _mockTokenInterceptor2.isPreHandleMintCalled();
    expect(checkBurnCalled2).eq(true);

    await waitForTx(await _mockBNFTMinter1.deleteTokenInterceptor(_user0TokenId1, _mockTokenInterceptor1.address));
    await waitForTx(await _mockBNFTMinter1.deleteTokenInterceptor(_user0TokenId1, _mockTokenInterceptor2.address));
  });
});
