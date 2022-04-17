import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import {
  deployAirdropDistribution,
  deployMockAirdrop,
  deployMockBNFTMinter,
  deployMockMockVRFCoordinatorV2,
} from "../helpers/contracts-deployments";
import {
  AirdropDistribution,
  MintableERC1155,
  MintableERC20,
  MintableERC721,
  MockAirdropProject,
  MockVRFCoordinatorV2,
} from "../types";
import { getDeploySigner, getMintableERC1155, getMintableERC20, getMintableERC721 } from "../helpers/contracts-getters";
import { ethers } from "ethers";
import { waitForTx } from "../helpers/misc-utils";

const { expect } = require("chai");

makeSuite("Airdrop: Distribution", (testEnv: TestEnv) => {
  let _mockVrfCoordinator = {} as MockVRFCoordinatorV2;
  let _mockVrfSubscriptionId = {} as string;

  let _airdropDistribution = {} as AirdropDistribution;
  let _mockAirdropProject = {} as MockAirdropProject;
  let _mockBNFTMinter = {} as MockBNFTMinter;

  let _mockAirdropERC20Address = {} as string;
  let _mockAirdropERC20Token = {} as MintableERC20;
  let _mockAirdropERC721Address = {} as string;
  let _mockAirdropERC721Token = {} as MintableERC721;
  let _mockAirdropERC1155Address = {} as string;
  let _mockAirdropERC1155Token = {} as MintableERC1155;

  before(async () => {
    const { bayc, bBAYC, bnftRegistry } = testEnv;

    _mockVrfCoordinator = await deployMockMockVRFCoordinatorV2(["0", "0"]);
    _mockVrfSubscriptionId = (await _mockVrfCoordinator.callStatic.createSubscription()).toString();
    await _mockVrfCoordinator.createSubscription();
    await _mockVrfCoordinator.fundSubscription(_mockVrfSubscriptionId, (1e18).toString());

    _airdropDistribution = await deployAirdropDistribution();
    await waitForTx(
      await _airdropDistribution.initialize(bnftRegistry.address, _mockVrfCoordinator.address, _mockVrfSubscriptionId)
    );
    //await waitForTx(await _airdropDistribution.configureVRFParams());

    _mockAirdropProject = await deployMockAirdrop([bnftRegistry.address]);
    _mockAirdropERC20Address = await _mockAirdropProject.erc20Token();
    _mockAirdropERC20Token = await getMintableERC20(_mockAirdropERC20Address);
    _mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    _mockAirdropERC721Token = await getMintableERC721(_mockAirdropERC721Address);
    _mockAirdropERC1155Address = await _mockAirdropProject.erc1155Token();
    _mockAirdropERC1155Token = await getMintableERC1155(_mockAirdropERC1155Address);

    _mockBNFTMinter = await deployMockBNFTMinter([bayc.address, bBAYC.address]);
  });

  afterEach(async () => {});

  it("Snapshot airdrop ERC721 and using fixed distribution", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const deployerSigner = await getDeploySigner();
    const nftOwner1 = users[1];
    const nftOwner2 = users[2];

    console.log("mint nft to bnft");
    await waitForTx(await bayc.setApprovalForAll(_mockBNFTMinter.address, true));

    const tokenId1 = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId1));
    await waitForTx(await _mockBNFTMinter.mint(nftOwner1.address, tokenId1));

    const tokenId2 = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId2));
    await waitForTx(await _mockBNFTMinter.mint(nftOwner2.address, tokenId2));

    console.log("snapshot airdrop to bBAYC");
    await waitForTx(await _mockAirdropProject.bnftSnapshotAirdrop(bayc.address, tokenId1));
    await waitForTx(await _mockAirdropProject.bnftSnapshotAirdrop(bayc.address, tokenId2));

    console.log("Airdrop ERC721 Balance:", await _mockAirdropERC721Token.balanceOf(bBAYC.address));

    expect(await _mockAirdropERC721Token.balanceOf(bBAYC.address)).to.be.equal(
      (await _mockAirdropProject.erc721Bonus()).mul(2)
    );

    console.log("transfer airdrop tokens to distribution");
    await waitForTx(
      await bBAYC
        .connect(deployerSigner)
        .claimERC721Airdrop(_mockAirdropERC721Token.address, _airdropDistribution.address, [tokenId1, tokenId2])
    );

    console.log("create & config fixed distribution");
    const airdropId = (
      await _airdropDistribution
        .connect(deployerSigner)
        .callStatic.createAirdrop(bayc.address, _mockAirdropERC721Token.address, 2, 1)
    ).toString();
    await waitForTx(
      await _airdropDistribution
        .connect(deployerSigner)
        .createAirdrop(bayc.address, _mockAirdropERC721Token.address, 2, 1)
    );

    await waitForTx(
      await _airdropDistribution
        .connect(deployerSigner)
        .configureNftUserTokenIds(airdropId, [nftOwner1.address, nftOwner2.address], [tokenId1, tokenId2])
    );

    console.log("nft owner claim erc721");
    await waitForTx(await _airdropDistribution.connect(nftOwner1.signer).claimERC721(airdropId));
    expect(await _mockAirdropERC721Token.ownerOf(tokenId1)).to.be.equal(nftOwner1.address);

    await waitForTx(await _airdropDistribution.connect(nftOwner2.signer).claimERC721(airdropId));
    expect(await _mockAirdropERC721Token.ownerOf(tokenId2)).to.be.equal(nftOwner2.address);
  });

  it("Snapshot airdrop ERC1155 and using random distribution", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const deployerSigner = await getDeploySigner();
    const nftOwner1 = users[1];
    const nftOwner2 = users[2];

    console.log("mint nft to bnft");
    await waitForTx(await bayc.setApprovalForAll(_mockBNFTMinter.address, true));

    const tokenId1 = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId1));
    await waitForTx(await _mockBNFTMinter.mint(nftOwner1.address, tokenId1));

    const tokenId2 = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId2));
    await waitForTx(await _mockBNFTMinter.mint(nftOwner2.address, tokenId2));

    console.log("snapshot airdrop to bBAYC");
    await waitForTx(await _mockAirdropProject.bnftSnapshotAirdrop(bayc.address, tokenId1));
    await waitForTx(await _mockAirdropProject.bnftSnapshotAirdrop(bayc.address, tokenId2));

    console.log("Airdrop ERC1155 Balance:", await _mockAirdropERC1155Token.balanceOf(bBAYC.address, tokenId1));
    console.log("Airdrop ERC1155 Balance:", await _mockAirdropERC1155Token.balanceOf(bBAYC.address, tokenId2));

    const erc1155Bonus = await _mockAirdropProject.erc1155Bonus();
    expect(await _mockAirdropERC1155Token.balanceOf(bBAYC.address, tokenId1)).to.be.equal(erc1155Bonus);
    expect(await _mockAirdropERC1155Token.balanceOf(bBAYC.address, tokenId2)).to.be.equal(erc1155Bonus);

    console.log("transfer airdrop tokens to distribution");
    await waitForTx(
      await bBAYC
        .connect(deployerSigner)
        .claimERC1155Airdrop(
          _mockAirdropERC1155Token.address,
          _airdropDistribution.address,
          [tokenId1, tokenId2],
          [erc1155Bonus, erc1155Bonus],
          []
        )
    );

    console.log("create & config fixed distribution");
    const airdropId = (
      await _airdropDistribution
        .connect(deployerSigner)
        .callStatic.createAirdrop(bayc.address, _mockAirdropERC1155Token.address, 3, 3)
    ).toString();
    await waitForTx(
      await _airdropDistribution
        .connect(deployerSigner)
        .createAirdrop(bayc.address, _mockAirdropERC1155Token.address, 3, 3)
    );
    await waitForTx(await _airdropDistribution.requestVRFRandomWords(airdropId));
    const airdropData = await _airdropDistribution.airdropDatas(airdropId);

    await waitForTx(
      await _airdropDistribution
        .connect(deployerSigner)
        .configureNftUserTokenIds(airdropId, [nftOwner1.address, nftOwner2.address], [tokenId1, tokenId2])
    );

    await waitForTx(
      await _airdropDistribution.connect(deployerSigner).configureERC1155(airdropId, [tokenId1, tokenId2])
    );

    console.log("fullfill random words");
    await waitForTx(
      await _mockVrfCoordinator.fulfillRandomWords(airdropData.vrfRequestId, _airdropDistribution.address)
    );

    console.log("nft owner claim erc1155");
    {
      await waitForTx(await _airdropDistribution.connect(nftOwner1.signer).claimERC1155(airdropId));

      const nftOwner1Token1Balance = await _mockAirdropERC1155Token.balanceOf(nftOwner1.address, tokenId1);
      const nftOwner1Token2Balance = await _mockAirdropERC1155Token.balanceOf(nftOwner1.address, tokenId2);
      expect(nftOwner1Token1Balance.add(nftOwner1Token2Balance)).to.be.equal(1);
    }

    {
      await waitForTx(await _airdropDistribution.connect(nftOwner2.signer).claimERC1155(airdropId));

      const nftOwner2Token1Balance = await _mockAirdropERC1155Token.balanceOf(nftOwner1.address, tokenId1);
      const nftOwner2Token2Balance = await _mockAirdropERC1155Token.balanceOf(nftOwner1.address, tokenId2);
      expect(nftOwner2Token1Balance.add(nftOwner2Token2Balance)).to.be.equal(1);
    }
  });
});
