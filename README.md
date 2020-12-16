# IBM Blockchain Platform Extension for VS Code

[![Version](https://vsmarketplacebadge.apphb.com/version/IBMBlockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Installs](https://vsmarketplacebadge.apphb.com/installs/IBMBLockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform)

The IBM Blockchain Platform extension helps developers to create, test and debug smart contracts, connect to Hyperledger Fabric environments, and build applications that transact on your blockchain network.

For a step-by-step guide on getting started with the extension's features, access our Beginner Tutorial via our integrated Home page. Alternatively, explore, clone and open the Hyperledger Fabric samples, all without leaving VS Code. For more comprehensive documentation, [follow this link](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-develop-vscode)

![IBP Extension Homepage](media/VSCodeImage.png)

## Want to learn more about the IBM Blockchain Platform?

Join us for the IBM Blockchain Platform User Series where product and technical experts share their expertise and educate on a specific feature, function or capability of the IBM Blockchain Platform. Get the answers to your questions and engage live with the experts, while ensuring you're leveraging all that the IBM Blockchain Platform has to offer.

**[Click here to find out more information about the IBM Blockchain Platform User Series webcast!](http://ibm.biz/blockchainuserseries)**

**[Click here to schedule a free 1:1 consultation with an IBM Blockchain Platform expert!](https://www.ibm.com/blockchain/platform?schedulerform)**


## Installation

Please visit the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) for installation and more details.

## Requirements

The first time you install this extension, it will check your system for the prequisites, and guide you to install any that you are missing. 

Windows 10, Linux, or Mac OS are currently the supported operating systems.
Each of these operating systems have their own additional requirements. 

For the full list of requirements that the extension will check for, please refer to the ['Dependency Installation'](#dependency-installation) section at the end of the README.


## Smart Contract Development Lifecycle
_Please note that all commands contributed by this extension are accessible via the VS Code Command Palette. The commands outlined below are available from burger menus located on the panel headers, or by right-clicking tree items, in the extension's side bar view._

The expected smart contract development lifecycle follows several broad points, all possible entirely within VS Code using this extension:
1. Creating and packaging a smart contract
2. Connecting to an instance of Hyperledger Fabric
3. Deploying a smart contract
4. Submitting transactions and generating functional-level smart contract tests


## Common tasks and how to complete them

Once you have installed the IBM Blockchain Platform VS Code extension, it is possible to access a large set of tutorials using the `>View Tutorial Gallery` command.

**The tutorial gallery is best place to start once you have installed the extension and will teach you mostly everything that you need to know!**


*Some information on how to complete other undocumented tasks can be found [here.](https://github.com/IBM-Blockchain/blockchain-vscode-extension/wiki/Common-tasks-and-how-to-complete-them#using-transaction-data-files-to-submit-a-transaction)*

## Useful Commands
The IBM Blockchain Platform extension provides an explorer and commands accessible from the Command Palette, for developing smart contracts quickly:
<!---Table of commands with columns: 'command' and 'description'
--->

| Command | Description |
| --- | --- |
| Add Environment | Add a Hyperledger Fabric instance environment |
| Add Gateway | Add a Hyperledger Fabric instance gateway |
| Add Identity To Wallet | Add an identity into a wallet to be used when connecting to a Hyperledger Fabric gateway |
| Add Wallet | Add a wallet containing identities to be used when connecting to a gateway |
| Associate A Wallet | Associate a wallet with a gateway to be used when connecting |
| Associate Directory for Transaction Data | Associate a directory of transasction data with a smart contract
| Associate Identity with a Node | Associate an identity with a node to enable the extension to connect to that node |
| Connect Via Gateway | Connect to a Hyperledger Fabric instance using a gateway |
| Create New Project | Create a new smart contract project |
| Create Identity (register and enroll) | Create, register and enroll a new identity from the local Fabric runtime certificate authority |
| Delete Environment | Delete a Hyperledger Fabric instance environment |
| Delete Identity | Delete an identity from a wallet |
| Delete Gateway | Delete a Hyperledger Fabric instance gateway |
| Delete Package | Delete a smart contract package |
| Dissociate A Wallet | Remove the association between a wallet and a gateway |
| Dissociate Directory for Transaction Data | Remove the association between a directory of transaction data and a smart contract |
| Disconnect From Environment | Disconnect from the environment you're currently connected to |
| Disconnect From Gateway | Disconnect from the blockchain gateway you're currently connected to |
| Export Connection Profile | Export connection profile for a blockchain gateway |
| Export Package | Export a smart contract package to use outside VS Code |
| Export Wallet | Export a wallet to use outside VS Code |
| Generate Tests for All Smart Contracts| Create functional level test files for all contracts |
| Generate Tests for Smart Contract(s) | Create functional level test files for single or multiple contracts |
| Import a Package | Import a smart contract package |
| Import nodes into environment | Import more nodes into an environment |
| Open Release Notes | Open the release notes page |
| Package Open Project | Create a new smart contract package from a project in the Explorer |
| Remove Wallet | Remove a wallet from the Fabric Wallets view |
| Replace Identity Associated with a Node | Replace which identity is associated with a node |
| Restart Fabric Runtime | Restart the local Fabric instance |
| Start Fabric Runtime | Start the local Fabric instance |
| Stop Fabric Runtime | Stop the local Fabric instance |
| Subscribe to Event | Subscribe to an event emitted from a smart contract |
| Teardown Fabric Environment | Teardown the local Fabric runtime (hard reset) |
| Transact with Smart Contract | Submit & evalutate transactions to deployed smart contracts |
| Upgrade Smart Contract | Upgrade an instantiated smart contract |
| View Homepage | View the extensions homepage |
| View Sample Gallery | View the smart contract and application sample gallery |
| View Prerequisites | View the required and optional dependencies on the prerequisites page |

## Dependency Installation
<details>
<summary>Click to view installation instructions</summary>

The following dependencies are required on all operating systems: 
- [VS Code version 1.40.0 or greater](https://code.visualstudio.com)
> VS Code version can be found by running: `code --version`

The following dependencies are optional:

- [Node v10 (v10.15.3 or greater) or v12 (v12.13.1 or greater) and npm v6.x or greater](https://nodejs.org/en/download/)
> Node version can be found by running: `node --version`
>
> npm version can be found by running: `npm --version`

**If installing Node and npm using a manager such as 'nvm' or 'nodenv', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.**

- [Go version v1.12 or greater for developing Go contracts](https://golang.org/dl/)
> Go version can be found by running: `go version`

- [Java v8 for developing Java contracts](https://adoptopenjdk.net/?variant=openjdk8)
> Java version can be found by running: `java -version`


### Additional requirements for Windows

- You are using Windows 10 Pro or Enterprise and have the Anniversary Update 1607

### 1 Org Local Fabric functionality

This extension can use Docker to run a simple pre-configured local Hyperledger Fabric network on your machine. By default this feature is enabled as we highly recommend using it, however you may disable this feature if required.

You will need the following:

- [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
> Docker version can be found by running: `docker --version`

#### Additional requirements for Windows

- Docker for Windows is configured to use Linux containers (this is the default)
- You will need to install OpenSSL v1.0.2 [OpenSSL binaries](https://www.openssl.org/community/binaries.html)
  - Install the normal version, not the version marked as "light"
  - Install the Win64 version into `C:\OpenSSL-Win64` on 64-bit systems

For more information see the [1 Org Local Fabric](#1-org-local-fabric) section.

### Additional information
To open the Prerequisites page manually, run the `View Prerequisites` command inside VS Code from the Command Palette.

Please note: the extension doesn't currently work with the VSCode Remote Development feature, we plan to make this work in the future, follow progress [here](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1357). 

</details>

## Contact Us
If you have find any problems or want to make suggestions for future features please create [issues and suggestions on Github](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues).

## Just so you know

The extension uses telemetry reporting to track usage data and help improve future extension versions. Disabling VS Code telemetry reporting also disables the extension's telemetry reporting.
For instructions on how to disable telemetry reporting, please visit the [Visual Studio Code FAQ](https://code.visualstudio.com/docs/supporting/FAQ#_how-to-disable-telemetry-reporting)

## License <a name="license"></a>
The source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE.txt) file.

This software uses the IBM Plex Sans font licensed under the SIL Open Font License, Version 1.1.
Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL
