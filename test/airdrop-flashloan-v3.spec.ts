import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import {
  deployAirdropFlashLoanReceiverV3,
  deployMockAirdrop,
  deployMockBNFTMinter,
} from "../helpers/contracts-deployments";
import { AirdropFlashLoanReceiverV3, MockAirdropProject } from "../types";
import { getMintableERC1155, getMintableERC20, getMintableERC721 } from "../helpers/contracts-getters";
import { ethers } from "ethers";
import { waitForTx } from "../helpers/misc-utils";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";

const { expect } = require("chai");

makeSuite("Airdrop: FlashLoan V3", (testEnv: TestEnv) => {
  let _airdropFlashLoanReceiver = {} as AirdropFlashLoanReceiverV3;
  let _mockAirdropProject = {} as MockAirdropProject;
  let _mockBNFTMinter = {} as MockBNFTMinter;
  let airdropERC721TokenId: string;
  let airdropERC1155TokenId: string;

  before(async () => {
    const { bayc, bBAYC, bnftRegistry } = testEnv;

    _airdropFlashLoanReceiver = await deployAirdropFlashLoanReceiverV3(
      testEnv.users[0].address,
      bnftRegistry.address,
      "0"
    );

    _mockAirdropProject = await deployMockAirdrop([bnftRegistry.address]);
    _mockBNFTMinter = await deployMockBNFTMinter([bayc.address, bBAYC.address]);
  });

  afterEach(async () => {});

  it("Tries to approve token - invalid owner (revert expected)", async () => {
    const { users } = testEnv;
    const user0 = users[0];
    const user2 = users[2];
    const user3 = users[3];

    const mockAirdropERC20Address = await _mockAirdropProject.erc20Token();
    const mockAirdropERC20Token = await getMintableERC20(mockAirdropERC20Address);
    const mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const mockAirdropERC1155Address = await _mockAirdropProject.erc1155Token();
    const mockAirdropERC1155Token = await getMintableERC1155(mockAirdropERC1155Address);

    await expect(
      _airdropFlashLoanReceiver.connect(user2.signer).approveERC20(mockAirdropERC20Token.address, user3.address, 100)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      _airdropFlashLoanReceiver.connect(user2.signer).approveERC721(mockAirdropERC721Token.address, user3.address, 100)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      _airdropFlashLoanReceiver
        .connect(user2.signer)
        .approveERC721ForAll(mockAirdropERC721Token.address, user3.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      _airdropFlashLoanReceiver
        .connect(user2.signer)
        .approveERC1155ForAll(mockAirdropERC1155Token.address, user3.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Tries to transfer token - invalid owner (revert expected)", async () => {
    const { users } = testEnv;
    const user0 = users[0];
    const user2 = users[2];
    const user3 = users[3];

    const mockAirdropERC20Address = await _mockAirdropProject.erc20Token();
    const mockAirdropERC20Token = await getMintableERC20(mockAirdropERC20Address);
    const mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const mockAirdropERC1155Address = await _mockAirdropProject.erc1155Token();
    const mockAirdropERC1155Token = await getMintableERC1155(mockAirdropERC1155Address);

    await expect(
      _airdropFlashLoanReceiver.connect(user2.signer).transferERC20(mockAirdropERC20Token.address, user3.address, 100)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      _airdropFlashLoanReceiver.connect(user2.signer).transferERC721(mockAirdropERC721Token.address, user3.address, 100)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(
      _airdropFlashLoanReceiver
        .connect(user2.signer)
        .transferERC1155(mockAirdropERC1155Token.address, user3.address, 100, 1)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Apply airdrop using flashLoan - ERC20/ERC721/ERC1155", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner = users[0];

    await waitForTx(await bayc.setApprovalForAll(_mockBNFTMinter.address, true));

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId));

    await waitForTx(await _mockBNFTMinter.mint(nftOwner.address, tokenId));

    const mockAirdropERC20Address = await _mockAirdropProject.erc20Token();
    const mockAirdropERC20Token = await getMintableERC20(mockAirdropERC20Address);
    const mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const mockAirdropERC1155Address = await _mockAirdropProject.erc1155Token();
    const mockAirdropERC1155Token = await getMintableERC1155(mockAirdropERC1155Address);

    const erc1155Id = (await _mockAirdropProject.getERC1155TokenId(tokenId)).toString();
    console.log("tokenId:", tokenId, "erc1155Id:", erc1155Id, "owner:", nftOwner.address);

    const applyAirdropEncodedData = _mockAirdropProject.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [
        [1, 2, 3],
        [mockAirdropERC20Address, mockAirdropERC721Address, mockAirdropERC1155Address],
        [0, 0, erc1155Id],
        _mockAirdropProject.address,
        applyAirdropEncodedData,
      ]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    await waitForTx(
      await bBAYC.connect(nftOwner.signer).flashLoan(_airdropFlashLoanReceiver.address, [tokenId], receiverEncodedData)
    );

    console.log("Airdrop ERC20 Balance:", await mockAirdropERC20Token.balanceOf(nftOwner.address));
    console.log("Airdrop ERC721 Balance:", await mockAirdropERC721Token.balanceOf(nftOwner.address));
    console.log("Airdrop ERC1155 Balance:", await mockAirdropERC1155Token.balanceOf(nftOwner.address, erc1155Id));

    expect(await mockAirdropERC20Token.balanceOf(nftOwner.address)).to.be.equal(await _mockAirdropProject.erc20Bonus());
    expect(await mockAirdropERC721Token.balanceOf(nftOwner.address)).to.be.equal(
      await _mockAirdropProject.erc721Bonus()
    );
    expect(await mockAirdropERC1155Token.balanceOf(nftOwner.address, erc1155Id)).to.be.equal(
      await _mockAirdropProject.erc1155Bonus()
    );
  });

  it("Apply airdrop using flashLoan - ERC721 without Enumerate", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner = users[0];

    await waitForTx(await bayc.setApprovalForAll(_mockBNFTMinter.address, true));

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId));

    await waitForTx(await _mockBNFTMinter.mint(nftOwner.address, tokenId));

    const mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const erc721Bonus = await _mockAirdropProject.erc721Bonus();

    const applyAirdropEncodedData = _mockAirdropProject.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    const receiverEncodedData = ethers.utils.defaultAbiCoder.encode(
      ["uint256[]", "address[]", "uint256[]", "address", "bytes"],
      [[4], [mockAirdropERC721Address], [tokenId], _mockAirdropProject.address, applyAirdropEncodedData]
    );
    console.log("receiverEncodedData:", receiverEncodedData);

    const erc721BalanceBefore = await mockAirdropERC721Token.balanceOf(nftOwner.address);

    await waitForTx(
      await bBAYC.connect(nftOwner.signer).flashLoan(_airdropFlashLoanReceiver.address, [tokenId], receiverEncodedData)
    );

    console.log("Airdrop ERC721 Balance:", await mockAirdropERC721Token.balanceOf(nftOwner.address));

    const erc721BalanceAfter = await mockAirdropERC721Token.balanceOf(nftOwner.address);
    expect(erc721BalanceAfter).to.be.equal(erc721Bonus.add(erc721BalanceBefore));
  });

  it("Apply airdrop using claim - ERC20/ERC721/ERC1155", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner = users[0];
    const user3 = users[3];

    const receiverOwnerAddress = await _airdropFlashLoanReceiver.owner();
    const receiverOwnerSigner = await getEthersSignerByAddress(receiverOwnerAddress);

    await waitForTx(await bayc.setApprovalForAll(_mockBNFTMinter.address, true));

    const tokenId = testEnv.tokenIdTracker++;
    await waitForTx(await bayc.mint(tokenId));
    const tokenOwner = await bayc.ownerOf(tokenId);
    const tokenSigner = await getEthersSignerByAddress(tokenOwner);

    await waitForTx(
      await bayc.connect(tokenSigner).transferFrom(tokenOwner, _airdropFlashLoanReceiver.address, tokenId)
    );

    const mockAirdropERC20Address = await _mockAirdropProject.erc20Token();
    const mockAirdropERC20Token = await getMintableERC20(mockAirdropERC20Address);
    const mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const mockAirdropERC1155Address = await _mockAirdropProject.erc1155Token();
    const mockAirdropERC1155Token = await getMintableERC1155(mockAirdropERC1155Address);

    const erc1155Id = (await _mockAirdropProject.getERC1155TokenId(tokenId)).toString();
    console.log("tokenId:", tokenId, "erc1155Id:", erc1155Id, "owner:", nftOwner.address);

    const applyAirdropEncodedData = _mockAirdropProject.interface.encodeFunctionData("nativeApplyAirdrop", [
      bayc.address,
      tokenId,
    ]);
    console.log("applyAirdropEncodedData:", applyAirdropEncodedData);

    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .callMethod(_mockAirdropProject.address, applyAirdropEncodedData)
    );

    const claimErc20Balance = await mockAirdropERC20Token.balanceOf(_airdropFlashLoanReceiver.address);
    const claimErc721Balance = await mockAirdropERC721Token.balanceOf(_airdropFlashLoanReceiver.address);
    const claimErc1155Balance = await mockAirdropERC1155Token.balanceOf(_airdropFlashLoanReceiver.address, erc1155Id);
    console.log("Claim ERC20 Balance:", claimErc20Balance);
    console.log("Claim ERC721 Balance:", claimErc721Balance);
    console.log("Claim ERC1155 Balance:", claimErc1155Balance);

    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .transferERC20(mockAirdropERC20Token.address, nftOwner.address, claimErc20Balance)
    );
    airdropERC721TokenId = tokenId.toString();
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .transferERC721(mockAirdropERC721Token.address, nftOwner.address, tokenId)
    );
    airdropERC1155TokenId = erc1155Id;
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .transferERC1155(mockAirdropERC1155Token.address, nftOwner.address, erc1155Id, claimErc1155Balance)
    );
  });

  it("Approve user3 to transfer token - ERC20/ERC721/ERC1155", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner = users[0];
    const user3 = users[3];
    const user4 = users[4];

    const receiverOwnerAddress = await _airdropFlashLoanReceiver.owner();
    const receiverOwnerSigner = await getEthersSignerByAddress(receiverOwnerAddress);

    const mockAirdropERC20Address = await _mockAirdropProject.erc20Token();
    const mockAirdropERC20Token = await getMintableERC20(mockAirdropERC20Address);
    const mockAirdropERC721Address = await _mockAirdropProject.erc721Token();
    const mockAirdropERC721Token = await getMintableERC721(mockAirdropERC721Address);
    const mockAirdropERC1155Address = await _mockAirdropProject.erc1155Token();
    const mockAirdropERC1155Token = await getMintableERC1155(mockAirdropERC1155Address);

    console.log("nft owner transfer token to receiver");
    await waitForTx(
      await mockAirdropERC20Token.connect(nftOwner.signer).transfer(_airdropFlashLoanReceiver.address, 1)
    );
    await waitForTx(
      await mockAirdropERC721Token
        .connect(nftOwner.signer)
        .transferFrom(nftOwner.address, _airdropFlashLoanReceiver.address, airdropERC721TokenId)
    );
    await waitForTx(
      await mockAirdropERC1155Token
        .connect(nftOwner.signer)
        .safeTransferFrom(nftOwner.address, _airdropFlashLoanReceiver.address, airdropERC1155TokenId, 1, [])
    );

    console.log("receiver owner approve to user3");
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .approveERC20(mockAirdropERC20Token.address, user3.address, 100)
    );
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .approveERC721ForAll(mockAirdropERC721Token.address, user3.address, true)
    );
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .approveERC1155ForAll(mockAirdropERC1155Token.address, user3.address, true)
    );

    console.log("user3 transfer receiver token to user4");
    await waitForTx(
      await mockAirdropERC20Token
        .connect(user3.signer)
        .transferFrom(_airdropFlashLoanReceiver.address, user4.address, 1)
    );
    await waitForTx(
      await mockAirdropERC721Token
        .connect(user3.signer)
        .transferFrom(_airdropFlashLoanReceiver.address, user4.address, airdropERC721TokenId)
    );
    await waitForTx(
      await mockAirdropERC1155Token
        .connect(user3.signer)
        .safeTransferFrom(_airdropFlashLoanReceiver.address, user4.address, airdropERC1155TokenId, 1, [])
    );

    console.log("receiver owner remove approve to user3");
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .approveERC20(mockAirdropERC20Token.address, user3.address, 0)
    );
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .approveERC721ForAll(mockAirdropERC721Token.address, user3.address, false)
    );
    await waitForTx(
      await _airdropFlashLoanReceiver
        .connect(receiverOwnerSigner)
        .approveERC1155ForAll(mockAirdropERC1155Token.address, user3.address, false)
    );

    const erc20Allowance = await mockAirdropERC20Token.allowance(_airdropFlashLoanReceiver.address, user3.address);
    const erc721IsApproved = await mockAirdropERC721Token.isApprovedForAll(
      _airdropFlashLoanReceiver.address,
      user3.address
    );
    const erc1155Approved = await mockAirdropERC1155Token.isApprovedForAll(
      _airdropFlashLoanReceiver.address,
      user3.address
    );

    expect(erc20Allowance).to.be.equal(0);
    expect(erc721IsApproved).to.be.equal(false);
    expect(erc1155Approved).to.be.equal(false);
  });
});
