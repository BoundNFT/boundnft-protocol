const fs = require("fs")
const path = require("path");

const protocolContractList = [
  "BNFTRegistry",
  "BNFT",
];

const interfacesContractList = ["IERC721Detailed", "IFlashLoanReceiver"];

const miscContractList = [
  "BoundPunkGateway",
  "AirdropFlashLoanReceiver",
  "AirdropFlashLoanReceiverV2",
  "AirdropFlashLoanReceiverV3",
  "AirdropDistribution",
  "UserFlashclaimRegistry",
  "UserFlashclaimRegistryV2",
  "UserFlashclaimRegistryV3",
  "ICloneXEgg",
];

const updateAbis = async (subDir, contractList) => {
  contractList.forEach((contract) => {
    const artifact = require(`../artifacts/contracts/${subDir}/${contract}.sol/${contract}.json`);
    const { abi } = artifact;

    const configStringified = JSON.stringify(abi, null, 2);
    console.log("Getting ABI for contract: ", contract);
    const abiPath = `../abis/${contract}.json`;
    fs.writeFileSync(path.join(__dirname, abiPath), configStringified);
  });
};

function deleteFolderRecursive(directoryPath) {
    if (fs.existsSync(directoryPath)) {
        fs.rmSync(directoryPath, {recursive: true})
    }
}

deleteFolderRecursive("../abis");

updateAbis("protocol", protocolContractList).then().catch();

updateAbis("interfaces", interfacesContractList).then().catch();

updateAbis("misc", miscContractList).then().catch();
