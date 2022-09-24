import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import {
  deployAirdropFlashLoanReceiverV3,
  deployMintableERC20,
  deployMintableERC721,
  deployMockApeCoinStaking,
  deployMockBNFTMinter,
} from "../helpers/contracts-deployments";
import { AirdropFlashLoanReceiverV3, MintableERC20, MintableERC721, MockApeCoinStaking } from "../types";
import { ethers } from "ethers";
import { waitForTx } from "../helpers/misc-utils";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";
import BigNumber from "bignumber.js";

const { expect } = require("chai");

makeSuite("Flashclaim: ApeCoin Staking", (testEnv: TestEnv) => {
  let _flashClaimReceiver = {} as AirdropFlashLoanReceiverV3;
  let _receiverOwnerAddress = {} as string;
  let _receiverOwnerSigner = {} as ethers.Signer;

  let _mockApeCoinToken = {} as MintableERC20;
  let _mockBAYCToken = {} as MintableERC721;
  let _mockMAYCToken = {} as MintableERC721;
  let _mockBAKCToken = {} as MintableERC721;
  let _mockApeCoinStaking = {} as MockApeCoinStaking;
  let _mockBNFTMinter_BAYC = {} as MockBNFTMinter;

  const oneCoin = new BigNumber(10).pow(18);
  const _baycTokenId1 = 101;
  const _baycTokenId2 = 102;
  const _bakcTokenId1 = 1001;

  before(async () => {
    const { bayc, bBAYC, bnftRegistry } = testEnv;

    _flashClaimReceiver = await deployAirdropFlashLoanReceiverV3(testEnv.users[0].address, bnftRegistry.address, "0");
    _receiverOwnerAddress = await _flashClaimReceiver.owner();
    _receiverOwnerSigner = await getEthersSignerByAddress(_receiverOwnerAddress);

    _mockApeCoinToken = await deployMintableERC20(["APE", "APE", "18"]);

    _mockBAYCToken = testEnv.bayc;
    _mockMAYCToken = await deployMintableERC721(["MAYC", "MAYC"]);
    _mockBAKCToken = await deployMintableERC721(["BAKC", "BAKC"]);

    _mockApeCoinStaking = await deployMockApeCoinStaking(
      _mockApeCoinToken.address,
      _mockBAYCToken.address,
      _mockMAYCToken.address,
      _mockBAKCToken.address
    );
    _mockBNFTMinter_BAYC = await deployMockBNFTMinter([bayc.address, bBAYC.address]);

    await waitForTx(await bayc.setApprovalForAll(_mockBNFTMinter_BAYC.address, true));
  });

  afterEach(async () => {});

  it("Preparing ApeCoin and BAKC tokens", async () => {
    // ApeCoin for Pool
    const mintAmountPool = oneCoin.multipliedBy(100000).toFixed(0);
    await waitForTx(await _mockApeCoinToken.connect(_receiverOwnerSigner).mint(mintAmountPool));

    await waitForTx(
      await _mockApeCoinToken.connect(_receiverOwnerSigner).transfer(_mockApeCoinStaking.address, mintAmountPool)
    );

    // ApeCoin
    const mintAmount = oneCoin.multipliedBy(1000).toFixed(0);
    await waitForTx(await _mockApeCoinToken.connect(_receiverOwnerSigner).mint(mintAmount));

    await waitForTx(
      await _mockApeCoinToken.connect(_receiverOwnerSigner).transfer(_flashClaimReceiver.address, mintAmount)
    );

    await waitForTx(
      await _flashClaimReceiver
        .connect(_receiverOwnerSigner)
        .approveERC20(_mockApeCoinToken.address, _mockApeCoinStaking.address, mintAmount)
    );

    // BAKC
    await waitForTx(await _mockBAKCToken.connect(_receiverOwnerSigner).mint(_bakcTokenId1));

    await waitForTx(
      await _mockBAKCToken
        .connect(_receiverOwnerSigner)
        .transferFrom(_receiverOwnerAddress, _flashClaimReceiver.address, _bakcTokenId1)
    );

    await waitForTx(
      await _flashClaimReceiver
        .connect(_receiverOwnerSigner)
        .approveERC721ForAll(_mockBAKCToken.address, _mockApeCoinStaking.address, true)
    );
  });

  it("Commit BAYC without BAKC to ApeCoinStaking", async () => {
    const { users, bayc, bBAYC } = testEnv;
    const nftOwner = users[0];

    await waitForTx(await _mockBAYCToken.mint(_baycTokenId1));

    await waitForTx(await _mockBNFTMinter_BAYC.mint(nftOwner.address, _baycTokenId1));

    const stakingAmount = oneCoin.multipliedBy(100).toFixed(0);
    const commitEncodedData = _mockApeCoinStaking.interface.encodeFunctionData("commit", [
      "BAYC",
      [_baycTokenId1],
      [],
      [stakingAmount],
    ]);
    console.log("commitEncodedData:", commitEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [[], [], [], _mockApeCoinStaking.address, commitEncodedData]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    const receiverContractBalanceBefore = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceBefore = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    await waitForTx(
      await bBAYC.connect(nftOwner.signer).flashLoan(_flashClaimReceiver.address, [_baycTokenId1], receiverEncodedData)
    );

    const stakingTokenData = await _mockApeCoinStaking.tokenDatas(_mockBAYCToken.address, _baycTokenId1);
    expect(stakingTokenData.valid).to.be.eq(true);

    const receiverContractBalanceAfter = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceAfter = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    const receiverContractBalanceDelta = receiverContractBalanceBefore.sub(receiverContractBalanceAfter);
    const stakingContractBalanceDelta = stakingContractBalanceAfter.sub(stakingContractBalanceBefore);
    expect(stakingContractBalanceDelta).to.be.eq(receiverContractBalanceDelta);
  });

  it("Commit BAYC with BAKC to ApeCoinStaking", async () => {
    const { users, bayc, bBAYC } = testEnv;
    const nftOwner = users[0];

    await waitForTx(await bayc.mint(_baycTokenId2));
    await waitForTx(await _mockBNFTMinter_BAYC.mint(nftOwner.address, _baycTokenId2));

    const stakingAmount = oneCoin.multipliedBy(100).toFixed(0);
    const commitEncodedData = _mockApeCoinStaking.interface.encodeFunctionData("commit", [
      "BAYC",
      [_baycTokenId2],
      [_bakcTokenId1],
      [stakingAmount],
    ]);
    console.log("commitEncodedData:", commitEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [[], [], [], _mockApeCoinStaking.address, commitEncodedData]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    const receiverContractBalanceBefore = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceBefore = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    await waitForTx(
      await bBAYC.connect(nftOwner.signer).flashLoan(_flashClaimReceiver.address, [_baycTokenId2], receiverEncodedData)
    );

    const stakingTokenDataBAYC = await _mockApeCoinStaking.tokenDatas(_mockBAYCToken.address, _baycTokenId2);
    expect(stakingTokenDataBAYC.valid).to.be.eq(true);

    const stakingTokenDataBAKC = await _mockApeCoinStaking.tokenDatas(_mockBAKCToken.address, _bakcTokenId1);
    expect(stakingTokenDataBAKC.valid).to.be.eq(true);

    const receiverContractBalanceAfter = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceAfter = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    const receiverContractBalanceDelta = receiverContractBalanceBefore.sub(receiverContractBalanceAfter);
    const stakingContractBalanceDelta = stakingContractBalanceAfter.sub(stakingContractBalanceBefore);
    expect(stakingContractBalanceDelta).to.be.eq(receiverContractBalanceDelta);
  });

  it("Deposit ApeCoin to ApeCoinStaking", async () => {
    const { users, bayc, bBAYC } = testEnv;
    const nftOwner = users[0];

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId));
    await waitForTx(await _mockBNFTMinter_BAYC.mint(nftOwner.address, tokenId));

    const stakingAmount = oneCoin.multipliedBy(100).toFixed(0);
    const depositEncodedData = _mockApeCoinStaking.interface.encodeFunctionData("deposit", ["BAYC", stakingAmount]);
    console.log("depositEncodedData:", depositEncodedData);

    const receiverContractBalanceBefore = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceBefore = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    await waitForTx(
      await _flashClaimReceiver
        .connect(_receiverOwnerSigner)
        .callMethod(_mockApeCoinStaking.address, depositEncodedData, 0)
    );

    const receiverContractBalanceAfter = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceAfter = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    const receiverContractBalanceDelta = receiverContractBalanceBefore.sub(receiverContractBalanceAfter);
    const stakingContractBalanceDelta = stakingContractBalanceAfter.sub(stakingContractBalanceBefore);
    expect(stakingContractBalanceDelta).to.be.eq(receiverContractBalanceDelta);
  });

  it("Withdraw ApeCoin from ApeCoinStaking", async () => {
    const { users, bayc, bBAYC } = testEnv;
    const nftOwner = users[0];

    const stakingAmount = oneCoin.multipliedBy(100).toFixed(0);
    const withdrawEncodedData = _mockApeCoinStaking.interface.encodeFunctionData("withdraw", ["BAYC", stakingAmount]);
    console.log("withdrawEncodedData:", withdrawEncodedData);

    const receiverContractBalanceBefore = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceBefore = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    await waitForTx(
      await _flashClaimReceiver
        .connect(_receiverOwnerSigner)
        .callMethod(_mockApeCoinStaking.address, withdrawEncodedData, 0)
    );

    const receiverContractBalanceAfter = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceAfter = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    const receiverContractBalanceDelta = receiverContractBalanceAfter.sub(receiverContractBalanceBefore);
    const stakingContractBalanceDelta = stakingContractBalanceBefore.sub(stakingContractBalanceAfter);
    expect(stakingContractBalanceDelta).to.be.eq(receiverContractBalanceDelta);
  });

  it("Claim rewards from ApeCoinStaking", async () => {
    const { users, bayc, bBAYC } = testEnv;
    const nftOwner = users[0];

    const claimEncodedData = _mockApeCoinStaking.interface.encodeFunctionData("claimRewards", [
      "BAYC",
      [_baycTokenId1, _baycTokenId2],
    ]);
    console.log("claimEncodedData:", claimEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [[], [], [], _mockApeCoinStaking.address, claimEncodedData]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    const receiverContractBalanceBefore = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceBefore = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    await waitForTx(
      await bBAYC
        .connect(nftOwner.signer)
        .flashLoan(_flashClaimReceiver.address, [_baycTokenId1, _baycTokenId2], receiverEncodedData)
    );

    const receiverContractBalanceAfter = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceAfter = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    const receiverContractBalanceDelta = receiverContractBalanceAfter.sub(receiverContractBalanceBefore);
    const stakingContractBalanceDelta = stakingContractBalanceBefore.sub(stakingContractBalanceAfter);
    expect(stakingContractBalanceDelta).to.be.eq(receiverContractBalanceDelta);
  });

  it("Uncommit from ApeCoinStaking", async () => {
    const { users, bayc, bBAYC } = testEnv;
    const nftOwner = users[0];

    const uncommitEncodedData = _mockApeCoinStaking.interface.encodeFunctionData("uncommit", ["BAYC", [_baycTokenId1]]);
    console.log("uncommitEncodedData:", uncommitEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [[], [], [], _mockApeCoinStaking.address, uncommitEncodedData]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    const receiverContractBalanceBefore = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceBefore = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    await waitForTx(
      await bBAYC
        .connect(nftOwner.signer)
        .flashLoan(_flashClaimReceiver.address, [_baycTokenId1, _baycTokenId2], receiverEncodedData)
    );

    const stakingTokenData = await _mockApeCoinStaking.tokenDatas(_mockBAYCToken.address, _baycTokenId1);
    expect(stakingTokenData.valid).to.be.eq(false);

    const receiverContractBalanceAfter = await _mockApeCoinToken.balanceOf(_flashClaimReceiver.address);
    const stakingContractBalanceAfter = await _mockApeCoinToken.balanceOf(_mockApeCoinStaking.address);

    const receiverContractBalanceDelta = receiverContractBalanceAfter.sub(receiverContractBalanceBefore);
    const stakingContractBalanceDelta = stakingContractBalanceBefore.sub(stakingContractBalanceAfter);
    expect(stakingContractBalanceDelta).to.be.eq(receiverContractBalanceDelta);
  });
});
