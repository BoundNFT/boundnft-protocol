[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Build pass](https://github.com/bendfi/bnft-protocol/actions/workflows/node.js.yml/badge.svg)](https://github.com/bendfi/bnft-protocol/actions/workflows/node.js.yml)
```
 ######  #     # ####### ####### 
 #     # ##    # #          #    
 #     # # #   # #          #    
 ######  #  #  # #####      #    
 #     # #   # # #          #    
 #     # #    ## #          #    
 ######  #     # #          #    
                                 
```

# BNFT Protocol

This repository contains the smart contracts source code and configuration for BNFT Protocol. The repository uses Hardhat as development enviroment for compilation, testing and deployment tasks.

## What is BNFT?

BNFT is a promissory note NFT collateral protocol where lending protocols can participate as minters.

## Documentation

The documentation of BNFT Protocol is in the following [BNFT documentation](https://docs.bnft.org/developers) link. At the documentation you can learn more about the protocol, see the contract interfaces, integration guides and audits.

For getting the latest contracts addresses, please check the [Deployed contracts](https://docs.bnft.org/developers/deployed-contracts/deployed-contracts) page at the documentation to stay up to date.

A more detailed and technical description of the protocol can be found in this repository, [here](./bnft-v1-whitepaper.pdf)

## Audits
TODO

## Connect with the community

You can join at the [Discord](https://bnft.org/discord) channel or at the [Governance Forum](https://governance.bnft.org/) for asking questions about the protocol or talk about BNFT with other peers.

## Getting Started

You can install `@bnft/bnft-protocol` as an NPM package in your Hardhat, Buidler or Truffle project to import the contracts and interfaces:

`npm install @bnft/bnft-protocol`

Import at Solidity files:

```
import {IBNFT} from "@bnft/bnft-protocol/contracts/interfaces/IBNFT.sol";

contract Misc {

  function mint(address bnft, uint256 token, address user) public {
    IBNFT(bnft).mint(token, user);
    {...}
  }
}
```

The JSON artifacts with the ABI and Bytecode are also included into the bundled NPM package at `artifacts/` directory.

Import JSON file via Node JS `require`:

```
const BNFTArtifact = require('@bnft/bnft-protocol/artifacts/contracts/protocol/BNFT.sol/BNFT.json');

// Log the ABI into console
console.log(BNFTArtifact.abi)
```

## Setup

The repository uses Docker Compose to manage sensitive keys and load the configuration. Prior any action like test or deploy, you must run `docker-compose up` to start the `contracts-env` container, and then connect to the container console via `docker-compose exec contracts-env bash`.

Follow the next steps to setup the repository:

- Install `docker` and `docker-compose`
- Create an enviroment file named `.env` and fill the next enviroment variables

```
# Mnemonic, only first address will be used
MNEMONIC=""

# Add Alchemy or Infura provider keys, alchemy takes preference at the config level
ALCHEMY_KEY=""
INFURA_KEY=""

# Optional Etherscan key, for automatize the verification of the contracts at Etherscan
ETHERSCAN_KEY=""

```

## Protocol configuration

The configurations related with the BNFT Protocol are located at `configs` directory. You can follow the `IMainConfiguration` interface to create new configuration or extend the current BNFT configuration.

## Test

You can run the full test suite with the following commands:

```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# A new Bash terminal is prompted, connected to the container
npm run test
```

## Deployments

For deploying BNFT Protocol, you can use the available scripts located at `package.json`. For a complete list, run `npm run` to see all the tasks.

### Prepare
```
# In one terminal
docker-compose up

# Open another tab or terminal
docker-compose exec contracts-env bash

# Runing NPM task
# npm run xxx
```

### Localhost deployment
```
# In first terminal
npm run hardhat:node

# In second terminal
npm run localhost:dev:migration
```

### Rinkeby deployment
```
# In one terminal
npm run rinkeby:full:migration
```

## Tools

This project integrates other tools commonly used alongside Hardhat in the ecosystem.

It also comes with a variety of other tools, preconfigured to work with the project code.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.js
node scripts/deploy.js
npx eslint '**/*.js'
npx eslint '**/*.js' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

## Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.template file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
