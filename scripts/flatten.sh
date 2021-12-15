#!/bin/bash
set -x #echo on

mkdir ./flattened
rm -rf ./flattened/*

npx hardhat flatten contracts/protocol/BNFTRegistry.sol > ./flattened/BNFTRegistry.sol
npx hardhat flatten contracts/protocol/BNFT.sol > ./flattened/BNFT.sol
