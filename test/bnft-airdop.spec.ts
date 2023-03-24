import { TestEnv, makeSuite } from "./helpers/make-suite";
import { MockBNFTMinter } from "../types/MockBNFTMinter";
import { waitForTx } from "../helpers/misc-utils";
import {
  BNFT,
  BNFTFactory,
  MintableERC1155,
  MintableERC1155Factory,
  MintableERC20,
  MintableERC20Factory,
  MintableERC721,
  MintableERC721Factory,
  MockBNFTMinterFactory,
} from "../types";
import { getDeploySigner } from "../helpers/contracts-getters";
import { getEthersSignerByAddress } from "../helpers/contracts-helpers";

const { expect } = require("chai");

makeSuite("BNFT: Claim airdrop function", (testEnv: TestEnv) => {
  let newBNFTInstance: BNFT;
  let mockERC20Instance: MintableERC20;
  let mockERC721Instance: MintableERC721;
  let mockERC1155Instance: MintableERC1155;

  before(async () => {
    newBNFTInstance = await new BNFTFactory(await getDeploySigner()).deploy();
    mockERC20Instance = await new MintableERC20Factory(await getDeploySigner()).deploy("Airdrop", "AD", "18");
    mockERC721Instance = await new MintableERC721Factory(await getDeploySigner()).deploy("Airdrop", "AD");
    mockERC1155Instance = await new MintableERC1155Factory(await getDeploySigner()).deploy();

    await testEnv.bBAYC.setClaimAdmin(await testEnv.bBAYC.owner());
  });

  afterEach(async () => {});
  /*
  it("External project doing airdrop tokens to bnft", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const user0 = users[0];

    await waitForTx(await mockERC20Instance.connect(user0.signer).mint(1000));
    await waitForTx(await mockERC20Instance.connect(user0.signer).transfer(bBAYC.address, 1000));

    await waitForTx(await mockERC721Instance.connect(user0.signer).mint(1));
    await waitForTx(
      await mockERC721Instance
        .connect(user0.signer)
        ["safeTransferFrom(address,address,uint256)"](user0.address, bBAYC.address, 1)
    );

    await waitForTx(await mockERC1155Instance.connect(user0.signer).mint(1, 10));
    await waitForTx(
      await mockERC1155Instance
        .connect(user0.signer)
        ["safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)"](
          user0.address,
          bBAYC.address,
          [1],
          [10],
          []
        )
    );
  });
  */

  it("Tries to call bnft claim airdrop - invalid claim admin (revert expected)", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const user0 = users[0];
    const user2 = users[2];

    await expect(
      bBAYC.connect(user2.signer).claimERC20Airdrop(mockERC20Instance.address, user0.address, "1")
    ).to.be.revertedWith("BNFT: caller is not the claim admin");

    await expect(
      bBAYC.connect(user2.signer).claimERC721Airdrop(mockERC721Instance.address, user0.address, ["1"])
    ).to.be.revertedWith("BNFT: caller is not the claim admin");

    await expect(
      bBAYC.connect(user2.signer).claimERC1155Airdrop(mockERC1155Instance.address, user0.address, ["1"], ["1"], [])
    ).to.be.revertedWith("BNFT: caller is not the claim admin");
  });

  it("Tries to call bnft claim airdrop - underlying asset (revert expected)", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const user0 = users[0];
    const user2 = users[2];

    const claimAdminAddress = await bBAYC.owner();
    const claimAdminSinger = await getEthersSignerByAddress(claimAdminAddress);

    await expect(
      bBAYC.connect(claimAdminSinger).claimERC20Airdrop(bayc.address, user0.address, "1")
    ).to.be.revertedWith("BNFT: token can not be underlying asset");

    await expect(
      bBAYC.connect(claimAdminSinger).claimERC721Airdrop(bayc.address, user0.address, ["1"])
    ).to.be.revertedWith("BNFT: token can not be underlying asset");

    await expect(
      bBAYC.connect(claimAdminSinger).claimERC1155Airdrop(bayc.address, user0.address, ["1"], ["1"], [])
    ).to.be.revertedWith("BNFT: token can not be underlying asset");
  });

  it("Tries to call bnft claim airdrop - self address (revert expected)", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const user0 = users[0];
    const user2 = users[2];

    const claimAdminAddress = await bBAYC.owner();
    const claimAdminSinger = await getEthersSignerByAddress(claimAdminAddress);

    await expect(
      bBAYC.connect(claimAdminSinger).claimERC20Airdrop(bBAYC.address, user0.address, "1")
    ).to.be.revertedWith("BNFT: token can not be self address");

    await expect(
      bBAYC.connect(claimAdminSinger).claimERC721Airdrop(bBAYC.address, user0.address, ["1"])
    ).to.be.revertedWith("BNFT: token can not be self address");

    await expect(
      bBAYC.connect(claimAdminSinger).claimERC1155Airdrop(bBAYC.address, user0.address, ["1"], ["1"], [])
    ).to.be.revertedWith("BNFT: token can not be self address");
  });

  /*it("Owner call claim airdrop and succeded", async () => {
    const { users, bayc, bBAYC, bnftRegistry } = testEnv;
    const user0 = users[0];
    const user5 = users[5];

    const claimAdminAddress = await bBAYC.claimAdmin();
    const claimAdminSinger = await getEthersSignerByAddress(claimAdminAddress);

    await waitForTx(
      await bBAYC.connect(claimAdminSinger).claimERC20Airdrop(mockERC20Instance.address, user5.address, "1000")
    );
    expect(await mockERC20Instance.balanceOf(user5.address)).to.be.equal("1000");

    await waitForTx(
      await bBAYC.connect(claimAdminSinger).claimERC721Airdrop(mockERC721Instance.address, user5.address, ["1"])
    );
    expect(await mockERC721Instance.ownerOf("1")).to.be.equal(user5.address);

    await waitForTx(
      await bBAYC
        .connect(claimAdminSinger)
        .claimERC1155Airdrop(mockERC1155Instance.address, user5.address, ["1"], ["10"], [])
    );
    expect(await mockERC1155Instance.balanceOf(user5.address, "1")).to.be.equal("10");
  });*/
});
