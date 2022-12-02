import { task } from "hardhat/config";
import {
  getAirdropFlashLoanReceiverV2,
  getBNFT,
  getBNFTRegistryProxy,
  getDeploySigner,
  getUserFlashclaimRegistryV2,
  getUserFlashclaimRegistryV3,
} from "../../helpers/contracts-getters";
import { getEthersSignerByAddress } from "../../helpers/contracts-helpers";
import { notFalsyOrZeroAddress, waitForTx } from "../../helpers/misc-utils";
import { IERC721EnumerableFactory } from "../../types/IERC721EnumerableFactory";
import { ICloneXEggFactory } from "../../types/ICloneXEggFactory";

task("clonex:bnft-mint-egg", "Doing claim airdrop for dev enviroment")
  .addParam("clonex", "Address of CloneX contract")
  .addParam("egg", "Address of Egg contract")
  .addParam("user", "Address of User")
  .addOptionalParam("ids", "ID list of CloneX token")
  .setAction(async ({ clonex, ids, egg, user }, localBRE) => {
    await localBRE.run("set-DRE");

    //const userSigner = await getEthersSignerByAddress(user);
    const userSigner = await getDeploySigner();

    const bnftRegistry = await getBNFTRegistryProxy();
    const bnftAddresses = await bnftRegistry.getBNFTAddresses(clonex);
    if (!notFalsyOrZeroAddress(bnftAddresses.bNftProxy)) {
      throw Error("Invalid token address");
    }

    const bnftToken = await getBNFT(bnftAddresses.bNftProxy);
    console.log("BoundNFT:", bnftAddresses.bNftProxy);

    const clonexContract = IERC721EnumerableFactory.connect(clonex, userSigner);
    const eggContract = ICloneXEggFactory.connect(egg, userSigner);

    let idsList: string[] = [];

    if (ids == undefined || ids == "") {
      const tokenNum = await bnftToken.balanceOf(user);
      console.log("balanceOf:", tokenNum.toNumber());

      for (let tokenIdx = 0; tokenIdx < tokenNum.toNumber(); tokenIdx++) {
        for (let tries = 3; tries > 0; tries--) {
          try {
            const tokenId = await bnftToken.tokenOfOwnerByIndex(user, tokenIdx);
            const canClaim = await eggContract.claimedClone(tokenId);
            if (!canClaim) {
              console.log("claimedClone:", tokenId.toString());
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

    const mintEncodedData = eggContract.interface.encodeFunctionData("mint", [idsList]);
    console.log("mintEncodedData:", mintEncodedData);

    const flashclaimRegistry = await getUserFlashclaimRegistryV2();
    const flashclaimRecvAddr = await flashclaimRegistry.userReceivers(user);
    console.log("flashclaimRecvAddr:", flashclaimRecvAddr);

    const flashclaimRecv = await getAirdropFlashLoanReceiverV2(flashclaimRecvAddr);
    const recvEncodedData = await flashclaimRecv.encodeFlashLoanParams(
      [5],
      [eggContract.address],
      [0],
      eggContract.address,
      mintEncodedData
    );
    console.log("recvEncodedData:", recvEncodedData);

    //await waitForTx(await bnftToken.connect(userSigner).flashLoan(flashclaimRecv.address, idsList, recvEncodedData));

    console.log("OK");
  });

task("clonex:native-mint-egg", "Doing claim airdrop for dev enviroment")
  .addParam("clonex", "Address of CloneX contract")
  .addParam("egg", "Address of Egg contract")
  .addParam("user", "Address of User")
  .addOptionalParam("ids", "ID list of CloneX token")
  .setAction(async ({ clonex, ids, egg, user }, localBRE) => {
    await localBRE.run("set-DRE");

    //const userSigner = await getEthersSignerByAddress(user);
    const userSigner = await getDeploySigner();

    const clonexContract = IERC721EnumerableFactory.connect(clonex, await getDeploySigner());
    const eggContract = ICloneXEggFactory.connect(egg, await getDeploySigner());

    let idsList: string[] = [];

    if (ids == undefined || ids == "") {
      const tokenNum = await clonexContract.balanceOf(user);
      console.log("balanceOf:", tokenNum.toNumber());

      for (let tokenIdx = 0; tokenIdx < tokenNum.toNumber(); tokenIdx++) {
        for (let tries = 3; tries > 0; tries--) {
          try {
            const tokenId = await clonexContract.tokenOfOwnerByIndex(user, tokenIdx);
            const canClaim = await eggContract.claimedClone(tokenId);
            if (!canClaim) {
              console.log("claimedClone:", tokenId.toString());
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

    const mintEncodedData = eggContract.interface.encodeFunctionData("mint", [idsList]);
    console.log("mintEncodedData:", mintEncodedData);

    //await waitForTx(await eggContract.connect(userSigner).mint(idsList));

    console.log("OK");
  });
