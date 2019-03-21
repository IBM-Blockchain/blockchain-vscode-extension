# IBM Blockchain Platform Extension for VSCode

[![Version](https://vsmarketplacebadge.apphb.com/version/IBMBlockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Installs](https://vsmarketplacebadge.apphb.com/installs/IBMBLockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Build Status](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension.svg?branch=master)](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension)

### Things in this readme

- [Prerequisites](#Prerequisites)
- [Installation](#Installation)
- [Smart Contract Development Lifecycle](#Smart-Contract-Development-Lifecycle)
  - [Creating smart contracts](#Creating-and-packaging-a-smart-contract)
  - [Connecting to Fabric](#Connecting-to-Fabric)
  - [Running and debugging a smart contract](#Running-and-Debugging-a-Smart-Contract)
- [Extension commands](#Extension-commands)
- [License and telemetry](#Just-so-you-know)


The IBM Blockchain Platform extension helps developers to create, test, and deploy smart contracts, and connect to Hyperledger Fabric environments.

We're working hard developing this extension, and we've got a lot planned before the v1.0 release, but if you find a bug, want to make a suggestion, or want to track the features we're working on, check our [Github repository](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues). If you have any questions or queries, [create a question on Stack Overflow](https://stackoverflow.com/questions/tagged/ibp-vscode-extension).

To get started with this extension quickly, follow the [**Quickstart Guide**](https://developer.ibm.com/tutorials/ibm-blockchain-platform-vscode-smart-contract) to learn how to develop, test, and deploy smart contracts using VSCode.

## Prerequisites

You will need the following installed in order to use the extension:
- [VSCode version 1.31 or greater](https://code.visualstudio.com)
- [Node v8.x or greater and npm v5.x or greater](https://nodejs.org/en/download/)
- [Yeoman (yo) v2.x](http://yeoman.io/)
- [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
- [Docker Compose v1.14.0 or greater](https://docs.docker.com/compose/install/)
- Windows 10, Linux, or Mac are currently the only supported operating systems.

If you are using Windows, you must also ensure the following:
- Docker for Windows is configured to use Linux containers (this is the default)
- You have installed the C++ Build Tools for Windows from [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools#windows-build-tools)
- You have installed OpenSSL v1.0.2 from [Win32 OpenSSL](http://slproweb.com/products/Win32OpenSSL.html)
  - Install the normal version, not the version marked as "light"
  - Install the Win32 version into `C:\OpenSSL-Win32` on 32-bit systems
  - Install the Win64 version into `C:\OpenSSL-Win64` on 64-bit systems

**Please note:** If a smart contract was created before version 0.1.0 of this extension, the `package.json` file must contain a dependency on `fabric-contract@1.4.0`.

If you require sudo/root to install npm modules, you must manually install the yeoman generator used to create smart contract projects using the following command: `npm install -g yo generator-fabric`

## Installation

To install the IBM Blockchain Platform VSCode extension, [**click here**](vscode:extension/IBMBlockchain.ibm-blockchain-platform) or visit the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) for more information.


## Smart Contract Development Lifecycle

The expected smart contract development lifecycle follows several broad points, all possible entirely within VSCode using this extension:

1. Creating and packaging a smart contract.
2. Connecting to an instance of Hyperledger Fabric.
3. Running and debugging a smart contract.

### Creating and packaging a smart contract

The first step of developing a smart contract is to create and package the smart contract into the correct format for deploying to an instance of Hyperledger Fabric. Creating and packaging a smart contract has three key steps:

- Create a smart contract project
- Write smart contract functions
- Package the smart contract for deployment


#### Creating a smart contract project

A smart contract project is a directory containing all the relevant contract and metadata files that define a smart contract. This extension currently supports creating TypeScript and JavaScript smart contract projects.

To create a smart contract project:

1. Select the `Create Smart Contract Project` command from the burger menu on the `Smart Contract Packages` panel.
2. Select a programming language for your smart contract, currently this extension supports TypeScript and JavaScript smart contracts.
3. Select the directory in which to store the smart contract project.
4. The extension will create a skeleton smart contract project, including a basic smart contract, unit tests, and a `package.json` metadata file.


#### Writing smart contract functions

When creating a smart contract project, a basic smart contract file is created in the `lib` or `src` directories. Smart contract functions can be added to and edited within this file to create the terms of your smart contract.

To write a smart contract:

1. Open the basic smart contract created by default in the smart contract project. The basic smart contract file in the `lib` directory if it's a JavaScript smart contract, or the `src` directory if it's a TypeScript smart contract.
2. Edit, update, or add new smart contract functions. For information on smart contract best practice and writing smart contracts, see the [Hyperledger Fabric documentation](linkety linkety link).
3. Save your smart contract ready for packaging.


#### Packaging a smart contract

Once the smart contract has been created and the smart contract functions have been written, the smart contract project must be packaged before it can be deployed.

To package a smart contract project:

1. Use the `Package a Smart Contract Project` command from the VSCode command palette or click **Add** in the extension explorer view.
2. Select the smart contract project to package.
3. The extension will package the smart contract project into a single Hyperledger Fabric smart contract package file, using the standard Hyperledger Fabric chaincode deployment specification format.
4. The smart contract package file can now be deployed to an instance of Hyperledger Fabric.


### Connecting to Fabric

This extension provides two methods for connecting to an instance of Hyperledger Fabric. Firstly, the extension includes a local instance of Hyperledger Fabric known as the **local_fabric** connection. Secondly, you can provide connection details for a running instance of Hyperledger Fabric and connect to that for service discovery purposes.

#### Using the **local_fabric** network

The **local_fabric** connection is a local implementation of Hyperledger Fabric contained in a Docker container. It can be used to rapidly develop and iterate on smart contracts.

**To start the local_fabric connection:**

1. Ensure that Docker is running.
2. From the IBM Blockchain Platform extension screen, click the local fabric runtime listed under the **Local Fabric Ops** pane.
3. The extension will download and deploy the pre-configured Hyperledger Fabric instance.

**To stop or teardown the local_fabric connection:**

1. From the IBM Blockchain Platform extension screen, click the ellipsis icon in the **Local Fabric Ops** bar.
2. Select **Stop** or **Teardown**.

If the local Hyperledger Fabric instance is stopped, the data is maintained, if teardown is selected, the data will not be recoverable.


#### Connecting to a running Fabric instance

Using this extension you can connect to your own Hyperledger Fabric instance. If you choose to connect to your own Hyperledger Fabric instance, it must be running Hyperledger Fabric v1.4.0 or later. From extension version 0.2.0 and later, you can use a file system wallet to import identities to connect with. Alternatively, provide a name, user certificate and private key and the extension will generate a new file system wallet. In either case, this file system wallet can be used by your Blockchain applications.

**Please note:** v0.3.0 has restructured fabric connections to fabric gateways, so you will need to add any connections created with previous releases again in order to use them.

**When using the pre-configured local instance of Hyperledger Fabric named `local_fabric`, the extension will automatically pull and use the correct Docker images.**

If you want to start and connect to your own Hyperledger Fabric instance, ensure that you are using Hyperledger Fabric v1.4.0 or later by following the Fabric documentation here:

https://hyperledger-fabric.readthedocs.io/en/release-1.4/install.html


#### Connecting to a Hyperledger Fabric instance

**To connect to the local Fabric instance using the default identity:**

The local instance of Hyperledger Fabric has a default gateway identity: **Admin@org1.example.com**.

To connect using the default gateway identity:

1. After starting the local Fabric instance, expand the **local_fabric** heading in the **Fabric Gateways** pane.
2. Click the identity listed **Admin@org1.example.com**.

After connecting

#### Editing an existing network connection

Gateways and their wallets can be edited by right-clicking and selecting `Edit Gateway` in the `Fabric Gateways` panel.  This will open User Settings, with the gateway available for editing. This is not available for the `local_fabric` runtime.

---

### Running and debugging a smart contract

_some text_

#### Install smart contract package

Smart contract packages are installed on Fabric peers.  Start `local_fabric`, find a peer under `Nodes` in the `Local Fabric Ops` panel and right-click to select `Install Smart Contract`. Alternatively click on `+ Install` or right-click `Installed` under `Smart Contracts` in the `Local Fabric Ops` panel.

#### Instantiate smart contract package

Start `local_fabric`, find a channel under `Channels` in the `Local Fabric Ops` panel and right-click to select `Instantiate Smart Contract`. Alternatively click on `+ Instantiate` or right-click `Instantiated` under `Smart Contracts` in the `Local Fabric Ops` panel. You will be asked to select from a list of open projects, smart contract packages or smart contracts installed on peers in the channel.

It is useful to think of installing on peers as the first step and instantiating on a channel as the second step of deploying a smart contract package.

#### Submit transaction

Once connected to a Fabric gateway in the `Fabric Gateways` panel, right-click a transaction under an instantiated smart contract and click `Submit transaction`. This will submit a transaction to a smart contract.

#### Debugging a smart contract

Debugging your smart contract allows you to run through the smart contract transactions with breakpoints and output, to ensure your transaction works as intended. To debug your smart contract follow these steps:

1. Ensure you are connected to the `local_fabric` runtime and that the `local_fabric` peer is in development mode. Development mode is indicated by an infinity symbol on a peer, under `Nodes` in the `Local Fabric Ops` panel. To toggle development mode, right-click the peer and select `Toggle Development Mode`.
2. Open your smart contract project in your workspace.
3. Open the debug view in Visual Studio Code using the left-hand navigation bar.
4. Select the `Debug Smart Contract` configuration by using the dropdown in the upper-left.
5. Package and install the smart contract by clicking the **play** button.
6. Add breakpoints to the smart contract by clicking on the relevant line numbers in your smart contract files.
7. Click **Instantiate** in the `Local Fabric Ops` panel. In the `Fabric Gateways` panel, you can now right click on transactions to submit them, execution will be paused on any breakpoints you've defined.

To make iterative changes to your smart contract while debugging, after making your changes click the **restart** button. Restarting debugging means you don't need to instantiate the contract again. Please note, as this stores the smart contract in local memory, for many changes to large smart contracts, you may need to reinstantiate the smart contract.

#### Export a smart contract package

Right-click a package and select the `Export Package` option.  You can select where the package is exported to. Use this to take the packages you have made and deploy them somewhere else, using other tools, such as the Fabric CLI (`peer chaincode install` command).


## Extension commands

The IBM Blockchain Platform extension provides an explorer and commands accessible from the Command Palette, for developing smart contracts quickly:

| Command | Description |
| --- | --- |
| Add Gateway | Add a Hyperledger Fabric instance gateway |
| Add Identity To Wallet | Add an identity to be used when connecting to a Hyperledger Fabric gateway  |
| Connect Via Gateway | Connect to a Hyperledger Fabric blockchain using a gateway |
| Create Smart Contract Project | Create a new JavaScript or TypeScript smart contract project |
| Debug | Debug a Smart Contract |
| Delete Gateway | Delete a Hyperledger Fabric instance gateway |
| Delete Package | Delete a smart contract package |
| Disconnect From Gateway | Disconnect from the blockchain gateway you're currently connected to |
| Edit Gateway | Edit connection profile or wallet used for connecting to a blockchain gateway |
| Export Connection Details | Export connection details for the a Hyperledger Fabric instance |
| Export Package | Export an already-packaged smart contract package to use outside VSCode |
| Generate Smart Contract Tests | Create a functional level test file for instantiated smart contracts |
| Install Smart Contract | Install a smart contract package onto a peer |
| Instantiate Smart Contract | Instantiate an installed smart contract package onto a channel<br>**Note: This currently doesn't work with IBM Blockchain Platform Enterprise plan - Coming soon!* |
| Open Fabric Runtime Terminal | Open a terminal with access to the Fabric runtime (peer CLI) |
| Package a Smart Contract Project | Create a new smart contract package from a project in the Explorer|
| Refresh Fabric Gateways | Refresh the Fabric Gateways view |
| Refresh Smart Contract Packages | Refresh the Smart Contract Packages view |
| Restart Local Fabric Ops | Refresh the Local Fabric Ops view |
| Start Fabric Runtime | Start a Hyperledger Fabric instance |
| Stop Fabric Runtime | Stop a Hyperledger Fabric instance |
| Submit Transaction | Submit a transaction to a smart contract |
| Teardown Fabric Runtime | Teardown the local_fabric runtime (hard reset) |
| Toggle Development Mode | Toggle the Hyperledger Fabric instance development mode |
| Upgrade Smart Contract | Upgrade an instantiated smart contract |
| View Homepage | View the extensions homepage |


## Just so you know <a name="license"></a>
The source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.

The extension uses telemetry reporting to track usage data and help improve future extension versions.

For instructions on how to disable telemetry reporting, please visit the visit the [Visual Studio Code FAQ](https://code.visualstudio.com/docs/supporting/FAQ#_how-to-disable-telemetry-reporting).

This software uses the IBM Plex Sans font licensed under the SIL Open Font License, Version 1.1.
Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL
