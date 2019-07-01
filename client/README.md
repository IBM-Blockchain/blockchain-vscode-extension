# IBM Blockchain Platform Extension for VS Code

[![Version](https://vsmarketplacebadge.apphb.com/version/IBMBlockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Installs](https://vsmarketplacebadge.apphb.com/installs/IBMBLockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Build Status](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension.svg?branch=master)](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension)

The IBM Blockchain Platform extension helps developers to create, test and debug smart contracts, connect to Hyperledger Fabric environments, and build applications that transact on your blockchain network.

For a step-by-step guide on getting started with the extension's features, access our Beginner Tutorial via our integrated Home page. Alternatively, explore, clone and open the Hyperledger Fabric samples, all without leaving VS Code. For more comprehensive documentation, [follow this link](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-develop-vscode)

![IBP Extension Homepage](client/media/VSCodeImage.png)

## Requirements

You will need the following installed in order to use the extension:
- Windows 10, Linux, or Mac OS are currently the supported operating systems.
- [VS Code version 1.32 or greater](https://code.visualstudio.com)
- [Node v8.x or greater and npm v5.x or greater](https://nodejs.org/en/download/)
- [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
- [Docker Compose v1.14.0 or greater](https://docs.docker.com/compose/install/)
- [Go version v1.12 or greater for developing Go contracts](https://golang.org/dl/)

If you are using Windows, you must also ensure the following:
- Docker for Windows is configured to use Linux containers (this is the default)
- You have installed the C++ Build Tools for Windows from [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools#windows-build-tools)
- You have installed OpenSSL v1.0.2 from [Win32 OpenSSL](http://slproweb.com/products/Win32OpenSSL.html)
  - Install the normal version, not the version marked as "light"
  - Install the Win32 version into `C:\OpenSSL-Win32` on 32-bit systems
  - Install the Win64 version into `C:\OpenSSL-Win64` on 64-bit systems

You can check your installed versions by running the following commands from a terminal:
- `node --version`
- `npm --version`
- `docker --version`
- `docker-compose --version`
- `go version`

## Smart Contract Development Lifecycle
_Please note that all commands contributed by this extension are accesible via the VS Code Command Palette. The commands outlined below are available from burger menus located on the panel headers, or by right-clicking tree items, in the extension's side bar view._

The expected smart contract development lifecycle follows several broad points, all possible entirely within VS Code using this extension:
1. Creating and packaging a smart contract
2. Connecting to an instance of Hyperledger Fabric
3. Running and debugging a smart contract
4. Submitting transactions and generating functional-level smart contract tests

### Create and Develop a Fabric smart contract project
A smart contract project is a directory containing all the relevant contract and metadata files that define a smart contract. Use the `Create Smart Contract Project` command to create a basic smart contract, available in JavaScript, TypeScript, Go or Java. 

### Package a smart contract project
To package a project you have open in your workspace, run the `Package a Smart Contract Package` command. Packages are listed in the `Smart Contract Packages` panel. The `Blockchain` output channel lists what files have been packaged during this action. Alternatively run the `Import Package` command to import a pre-existing .cds package to be used within VS Code. 

### Operate the local_fabric runtime
The extension contains a pre-configured local instance of Hyperledger Fabric named `local_fabric`, which the extension will automatically pull and use the correct Docker images for. It is a pre-configured network with one organization, one peer and one channel. It can be enabled and operated under the `Local Fabric Ops` panel. The first time it is started, Fabric images will be installed and an admin identity created in the `local_fabric_wallet` wallet. 

For `local_fabric` management tasks such as restart and teardown, see the `Local Fabric Ops` panel burger menu.

### Install and Instantiate smart contract packages
Deploying a smart contract package is a two step process: install the package on a peer and instantiate it on a channel. Run the `Install Smart Contract` command, followed by the `Instantiate Smart Contract` command to deploy your smart contract package on the `local_fabric` runtime. The deployed smart contracts are listed in the `Local Fabric Ops` panel. 

### Debugging a smart contract
Debugging your smart contract allows you to run through the smart contract transactions with breakpoints and output, to ensure your transaction works as intended. 

To debug Go smart contracts, please install the [Go extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.Go).
To debug Java smart contracts, please install the [Language Support for Java extension](https://marketplace.visualstudio.com/items?itemName=redhat.java) and the [Debugger for Java extension](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-java-debug)

To debug Node (JavaScript or TypeScript) chaincode written using the low-level programming model, you must add the `program` attribute to your launch configuration in launch.json. It should contain the path to the file calling `Shim.start`. For example:
```
{
    "type": "fabric:node",
    "request": "launch",
    "name": "Debug Smart Contract",
    "program": "${workspaceFolder}/dist/start.js"
} 

```
where `start.js` contains the line `Shim.start(new Chaincode());`.

To debug your smart contract follow these steps:

1. Ensure you are connected to the `local_fabric` runtime and that the `local_fabric` peer is in development mode. Development mode is indicated by an infinity symbol on a peer, under `Nodes` in the `Local Fabric Ops` panel. To toggle development mode, right-click the peer and select `Toggle Development Mode`. By toggling development mode, transactions will now have a large timeout value.
2. Open your smart contract project in your workspace.
3. Open the debug view in Visual Studio Code using the left-hand navigation bar.
4. Select the `Debug Smart Contract` configuration by using the dropdown in the upper-left and click the **play** button on the debug toolbar.
5. Select `Instantiate Smart Contract` from the blockchain icon on the debug toolbar. This action will package, install and instantiate a debug version of the selected smart contract. If there is a version of the selected smart contract already instantiated, select `Upgrade Smart Contract`. 
6. Add breakpoints to the smart contract by clicking on the relevant line numbers in your smart contract files.
7. To submit or evaluate a transaction, click the blockchain icon on the debug toolbar. Alternatively, in the `Fabric Gateways` panel, you can right click on transactions to submit or evaluate them. Execution will be paused on any breakpoints you've defined.

To make iterative changes to your smart contract while debugging, after making your changes click the **restart** button. You can also stop the debugging session, make futher changes and start debugging again, without needing to upgrade your smart contract. Please note, as this stores the smart contract in local memory, for many changes to large smart contracts, you may need to reinstantiate the smart contract. If you restart the `local_fabric` runtime after stopping a debugging session, you must select `Upgrade Smart Contract` by clicking the blockchain icon on the debug toolbar. This will install a new `vscode-debug-XXXXXXX` version of your smart contract, which then allows you to continue submitting and debugging transactions.

### Add a gateway for connecting to your own Hyperledger Fabric instance
To connect to our own Hyperledger Fabric instance, it must be running [Hyperledger Fabric v1.4.1](https://hyperledger-fabric.readthedocs.io/en/release-1.4/install.html) or later.

Add your gateway by providing a name and connection profile via the `Add Gateway` command; it will be listed in the `Fabric Gateways` panel. Add a file system wallet to connect to your gateway with via the `Add Wallet` command.

### Connect to a gateway and discover its resources
Connect by clicking on a gateway in the `Fabric Gateways` panel, and expand the navigation tree to explore its resources. Instantiated Smart Contracts are listed under the channel and from here you can generate functional-level test files on single or multiple smart contracts. Submit or evaluate individual transactions listed under the instantiated smart contracts, with the result displayed in the `Blockchain` output channel. 

### Wallet Management
The extension creates a `local_fabric_wallet` file system wallet when it is installed, which is used to connect to the `local_fabric` runtime instance and is automatically associated with that gateway. When `local_fabric` is started, an admin identity is added to the `local_fabric_wallet` and cannot be deleted unless the `local_fabric` runtime is torn down.

The `Add Identity to Wallet` command will ask for a name, MSPID and a method to add an identity. These methods include providing a certificate and private key, a JSON identity file, or a gateway, enrollment id and secret.

For wallets associated with other remote Fabric gateways, the `Add Wallet`,`Edit Wallet` ,`Export Wallet` and `Remove Wallet` commands are available in the `Fabric Wallets` panel for wallet management.

## Useful Commands
The IBM Blockchain Platform extension provides an explorer and commands accessible from the Command Palette, for developing smart contracts quickly:
<!---Table of commands with columns: 'command' and 'description'
--->

| Command | Description |
| --- | --- |
| Add Gateway | Add a Hyperledger Fabric instance gateway |
| Add Identity To Wallet | Add an identity into a wallet to be used when connecting to a Hyperledger Fabric gateway |
| Add Wallet | Add a wallet containing identities to be used when connecting to a gateway |
| Associate A Wallet | Associate a wallet with a gateway to be used when connecting |
| Connect Via Gateway | Connect to a Hyperledger Fabric instance using a gateway |
| Create Smart Contract Project | Create a new smart contract project |
| Create Identity (register and enroll) | Create, register and enroll a new identity from the local_fabric runtime certificate authority |
| Debug | Debug a Smart Contract |
| Delete Identity | Delete an identity from a wallet |
| Delete Gateway | Delete a Hyperledger Fabric instance gateway |
| Delete Package | Delete a smart contract package |
| Disassociate A Wallet | Remove the association between a wallet and a gateway |
| Disconnect From Gateway | Disconnect from the blockchain gateway you're currently connected to |
| Edit Gateway | Edit connection profile for connecting to a blockchain gateway |
| Edit Wallet | Edit wallet containing identities used for connecting to a blockchain gateway |
| Evaluate Transaction | Evaluate a smart contract transaction |
| Export Connection Profile | Export connection profile for the local_fabric gateway |
| Export Package | Export a smart contract package to use outside VS Code |
| Export Wallet | Export a wallet to use outside VS Code |
| Generate Smart Contract Tests | Create functional level test files for single or multiple contracts |
| Import Package | Import a smart contract package |
| Install Smart Contract | Install a smart contract package onto a local_fabric runtime peer |
| Instantiate Smart Contract | Instantiate an installed smart contract package onto a channel |
| Open New Terminal | Open a new terminal on a specified Fabric node (peer, orderer, and fabric-ca-client CLIs) |
| Package a Smart Contract Project | Create a new smart contract package from a project in the Explorer |
| Remove Wallet | Remove a wallet from the Fabric Wallets view |
| Restart Fabric Runtime | Restart the local_fabric instance |
| Start Fabric Runtime | Start the local_fabric instance |
| Stop Fabric Runtime | Stop the local_fabric instance |
| Submit Transaction | Submit a transaction to a smart contract |
| Teardown Fabric Runtime | Teardown the local_fabric runtime (hard reset) |
| Toggle Development Mode | Toggle the local_fabric instance development mode |
| Upgrade Smart Contract | Upgrade an instantiated smart contract |
| View Homepage | View the extensions homepage |

## Contact Us
If you have find any problems or want to make suggestions for future features please create [issues and suggestions on Github](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues). For any questions please [create a question on Stack Overflow](https://stackoverflow.com/questions/tagged/ibp-vscode-extension).

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
