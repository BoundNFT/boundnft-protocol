import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import { deployMockAirdrop, deployMockBNFTMinter } from "../helpers/contracts-deployments";
import { MockAirdropProject } from "../types";
import { getMintableERC1155, getMintableERC20, getMintableERC721 } from "../helpers/contracts-getters";
import { waitForTx } from "../helpers/misc-utils";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";

const { expect } = require("chai");

makeSuite("BNFT: Airdrop Execute", (testEnv: TestEnv) => {
  let _mockAirdropProject = {} as MockAirdropProject;
  let _mockBNFTMinter = {} as MockBNFTMinter;

  before(async () => {
    const { bayc, bBAYC, bnftRegistry } = testEnv;

    _mockAirdropProject = await deployMockAirdrop([bnftRegistry.address]);
    _mockBNFTMinter = await deployMockBNFTMinter([bayc.address, bBAYC.address]);
  });

  afterEach(async () => {});

  it("Execute airdrop", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const nftOwner = users[0];
    const claimAdminAddr = await bBAYC.claimAdmin();
    const claimAdminSigner = await getEthersSignerByAddress(claimAdminAddr);

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

    await waitForTx(
      await bBAYC.connect(claimAdminSigner).executeAirdrop(_mockAirdropProject.address, applyAirdropEncodedData)
    );

    console.log("Airdrop ERC20 Balance:", await mockAirdropERC20Token.balanceOf(bBAYC.address));
    console.log("Airdrop ERC721 Balance:", await mockAirdropERC721Token.balanceOf(bBAYC.address));
    console.log("Airdrop ERC1155 Balance:", await mockAirdropERC1155Token.balanceOf(bBAYC.address, erc1155Id));

    expect(await mockAirdropERC20Token.balanceOf(bBAYC.address)).to.be.equal(await _mockAirdropProject.erc20Bonus());
    expect(await mockAirdropERC721Token.balanceOf(bBAYC.address)).to.be.equal(await _mockAirdropProject.erc721Bonus());
    expect(await mockAirdropERC1155Token.balanceOf(bBAYC.address, erc1155Id)).to.be.equal(
      await _mockAirdropProject.erc1155Bonus()
    );
  });
});
