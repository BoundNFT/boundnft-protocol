import { task } from "hardhat/config";
import {
  getAirdropDistribution,
  getBNFT,
  getBNFTRegistryProxy,
  getDeploySigner,
} from "../../helpers/contracts-getters";
import { getEthersSignerByAddress } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { IERC721EnumerableFactory } from "../../types/IERC721EnumerableFactory";
import { IAzukiTigerFactory } from "../../types/IAzukiTigerFactory";
import { AirdropDistributionFactory } from "../../types";

task("azuki:claim-tiger", "Doing claim airdrop for dev enviroment")
  .addParam("azuki", "Address of Azuki contract")
  .addParam("tiger", "Address of Tiger contract")
  .addOptionalParam("ids", "ID list of Azuki token")
  .setAction(async ({ azuki, ids, tiger }, localBRE) => {
    await localBRE.run("set-DRE");

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(azuki);
    if (!notFalsyOrZeroAddress(bnftAddresses.bNftProxy)) {
      throw Error("Invalid token address");
    }

    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);
    console.log("BoundNFT:", bnftAddresses.bNftProxy);
    const adminAddress = await bnftToken.claimAdmin();
    console.log("Claim Admin:", adminAddress);

    const azukiContract = IERC721EnumerableFactory.connect(azuki, await getDeploySigner());
    const tigerContract = IAzukiTigerFactory.connect(tiger, await getDeploySigner());

    let idsList: string[] = [];

    if (ids == undefined || ids == "") {
      const tokenNum = await azukiContract.balanceOf(bnftToken.address);
      console.log("balanceOf:", tokenNum.toNumber());

      for (let tokenIdx = 0; tokenIdx < tokenNum.toNumber(); tokenIdx++) {
        for (let tries = 3; tries > 0; tries--) {
          try {
            const tokenId = await azukiContract.tokenOfOwnerByIndex(bnftToken.address, tokenIdx);
            const canClaim = await tigerContract.azukiCanClaim(tokenId);
            if (canClaim) {
              console.log("azukiCanClaim:", tokenId.toString());
              idsList.push(tokenId.toString());
            }

            tries = 0;
          } catch (error) {
            tries--;
          }
        }
      }
    } else {
      idsList = new String(ids).replace(" ", "").split(",");
    }
    console.log("ids Num:", idsList.length);
    console.log("ids List:", idsList.join(","));

    const claimEncodedData = tigerContract.interface.encodeFunctionData("claim", [idsList]);
    console.log("claimEncodedData:", claimEncodedData);

    const adminSigner = await getEthersSignerByAddress(adminAddress);

    await waitForTx(await bnftToken.connect(adminSigner).executeAirdrop(tiger, claimEncodedData));

    console.log("OK");
  });

task("azuki:distribution", "Doing airdrop distirbution for dev enviroment")
  .addParam("azuki", "Address of Azuki contract")
  .addParam("ids", "ID list of Azuki token")
  .addParam("airdropId", "ID of Airdrop distirbution")
  .setAction(async ({ azuki, ids, airdropId }, localBRE) => {
    await localBRE.run("set-DRE");

    const azukiContract = IERC721EnumerableFactory.connect(azuki, await getDeploySigner());

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(azuki);
    if (!notFalsyOrZeroAddress(bnftAddresses.bNftProxy)) {
      throw Error("Invalid token address");
    }

    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);
    console.log("BoundNFT:", bnftAddresses.bNftProxy);

    let idsList = new String(ids).replace(" ", "").split(",");
    console.log("ids Num:", idsList.length);
    console.log("ids List:", idsList.join(","));

    let allUsers: string[] = [];
    for (const tokenId of idsList) {
      for (let tries = 3; tries > 0; tries--) {
        try {
          let tokenOwner = await azukiContract.ownerOf(tokenId);
          if (tokenOwner.toLowerCase() == bnftToken.address.toLowerCase()) {
            tokenOwner = await bnftToken.ownerOf(tokenId);
          }
          allUsers.push(tokenOwner);

          tries = 0;
        } catch (error) {
          console.log("Error ownerOf:", tokenId);

          tries--;
        }
      }
    }
    console.log("allUsers Num", allUsers.length);
    if (allUsers.length != idsList.length) {
      throw Error("allUsers != idsList");
    }
    console.log("allUsers List", allUsers.join(","));

    const airdropDistribution = await getAirdropDistribution();

    const configUserNftEncodedData = airdropDistribution.interface.encodeFunctionData("configureNftUserTokenIds", [
      airdropId,
      allUsers,
      idsList,
    ]);
    console.log("configUserNftEncodedData:", configUserNftEncodedData);

    console.log("OK");
  });
