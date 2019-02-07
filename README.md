# IBM Blockchain Platform Extension for VSCode

[![Version](https://vsmarketplacebadge.apphb.com/version/IBMBlockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Installs](https://vsmarketplacebadge.apphb.com/installs/IBMBLockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Build Status](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension.svg?branch=master)](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension) [![Build status](https://ci.appveyor.com/api/projects/status/pvipa2bkvl4ilita?svg=true)](https://ci.appveyor.com/project/sstone1/blockchain-vscode-extension-gi6xr)

The IBM Blockchain Platform extension has been created to assist users in developing, testing, and deploying smart contracts; including connecting to Hyperledger Fabric environments.

> ⚠ Please note: this extension is available for early experimentation.  There are many features and improvements to come before the v1.0 release.  Please bear this in mind, and if you find something you'd like to see added, let the team know by raising a GitHub issue or suggestion (see "Contact Us" below).

## Contact Us
If you have find any problems or want to make suggestions for future features please create [issues and suggestions on Github](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues). For any questions please [create a question on Stack Overflow](https://stackoverflow.com/questions/tagged/ibp-vscode-extension).

## Installation

**[Install the IBM Blockchain Platform extension here](vscode:extension/IBMBlockchain.ibm-blockchain-platform)**


Or visit the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) for more details

## Requirements

You will need the following installed in order to use the extension:
- [VSCode version 1.31 or greater](https://code.visualstudio.com)
- [Node v8.x or greater and npm v5.x or greater](https://nodejs.org/en/download/)
- [Yeoman (yo) v2.x](http://yeoman.io/)
- [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
- [Docker Compose v1.14.0 or greater](https://docs.docker.com/compose/install/)

> ⚠ Please note: From version 0.1.0+, your smart contract package.json should depend on at least fabric-contract@1.4.0-beta2. This is only required for smart contracts not created using version 0.1.0+ of this extension.

If you are using Windows, you must also ensure the following:
- Your version of Windows supports Hyper-V and Docker:
  - Windows 10 Enterprise, Pro, or Education with 1607 Anniversary Update or later
- Docker for Windows is configured to use Linux containers (this is the default)
- You have installed the C++ Build Tools for Windows from [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools#windows-build-tools)
- You have installed OpenSSL v1.0.2 from [Win32 OpenSSL](http://slproweb.com/products/Win32OpenSSL.html)
  - Install the normal version, not the version marked as "light"
  - Install the Win32 version into `C:\OpenSSL-Win32` on 32-bit systems
  - Install the Win64 version into `C:\OpenSSL-Win64` on 64-bit systems

You can check your installed versions by running the following commands from a terminal:
- `node --version`
- `npm --version`
- `yo --version`
- `docker --version`
- `docker-compose --version`


## Features
The IBM Blockchain Platform extension provides an explorer and commands accessible from the Command Palette, for developing smart contracts quickly:
<!---Table of commands with columns: 'command' and 'description'
--->

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

## Smart Contract Development Lifecycle
_Please note that all operations shown are also possible using the commands in the table above, issued at the VSCode command-prompt._

### Create a Fabric smart contract project
Use the `Create Smart Contract Project` command to start a new project. Select from the available smart contract programming languages. Choose a directory to store the project (or create a new one). A skeleton project will be generated with a very basic smart contract, unit tests, a `package.json` and other useful files.

<img src="/client/media/start_new_project_small.gif" width="85%" alt="Start a new Fabric smart contract project">


### Edit / write smart contract files
You'll find the smart contract file in the `lib` directory of a newly generated project.

<img src="/client/media/edit_write_files.png" width="85%" alt="Edit smart contract files">


### Package a smart contract project
To package a project you have open in your workspace, run the `Package a Smart Contract Package` command. Packages will be added to the `Smart Contract Packages` panel in the explorer view.

Alternatively, navigate to the explorer view (click the IBM Blockchain Platform icon in the left-navigation) then click the `add` icon on the Smart Contract Packages view (this will again package up the project you have open in your workspace).

When you package a smart contract project, all of the smart contract code is added into a new Fabric smart contract package file (using the standard Fabric chaincode deployment specification format). You can deploy this package using this extension. Alternatively, you can deploy the package using other tools, such as the Fabric CLI (`peer chaincode install` command).

<img src="/client/media/package_project.png" width="85%" alt="Create a package from a smart contract project">

### Export a smart contract package
Right-click a package and select the `Export Package` option.  You can select where the package is exported to. Use this to take the packages you have made and deploy them somewhere else, using other tools, such as the Fabric CLI (`peer chaincode install` command).

<img src="/client/media/export_smart_contract_package.png" width="85%" alt="Export a smart contract project">

### Connect to local_fabric runtime
The `local_fabric` runtime can be enabled in `Local Fabric Ops` panel. The first time you enable it, Fabric images will be installed.  
Click the menu on the `Local Fabric Ops` header-bar for management options (including start/stop and teardown).
Left-click the `local_fabric` identity to connect to it within the `Fabric Gateways` view.

<img src="/client/media/connect_to_local_fabric_runtime_small.gif" width="85%" alt="Connect to local_fabric runtime">

### Teardown the local_fabric runtime
When you start/stop the local_fabric, all data will be maintained. Choose `Teardown Fabric Runtime` from the `Local Fabric Ops` header-bar to completely teardown the runtime and start over (you must then confirm this action).

<img src="/client/media/teardown_fabric_runtime.gif" width="85%" alt="Teardown the local_fabric runtime">

### Connect to a specified (remote) Fabric runtime and discover the existing resources
Left-click a gateway identity to activate connect to the blockchain runtime it represents. Expand the sections in the navigation tree to explore its resources. When you're done, use the "back" icon in the section's header-bar to disconnect.

<img src="/client/media/discover_resources.png" width="85%" alt="Connect to the network and discover the existing resources">

### Install smart contract package
Smart contract packages are installed on Fabric peers.  Start `local_fabric`, find a peer under `Nodes` in the `Local Fabric Ops` panel and right-click to select `Install Smart Contract`. Alternatively click on `+ Install` or right-click `Installed` under `Smart Contracts` in the `Local Fabric Ops` panel

<img src="/client/media/install_smart_contract.png" width="85%" alt="Install new smart contract">

### Instantiate smart contract package
Start `local_fabric`, find a channel under `Channels` in the `Local Fabric Ops` panel and right-click to select `Instantiate Smart Contract`. Alternatively click on `+ Instantiate` or right-click `Instantiated` under `Smart Contracts` in the `Local Fabric Ops` panel. You will be asked to select from a list of open projects, smart contract packages or smart contracts installed on peers in the channel.

It is useful to think of installing on peers as the first step and instantiating on a channel as the second step of deploying a smart contract package.

<img src="/client/media/instantiate_small.gif" width="85%" alt="Instantiate new smart contract">

### Submit transaction
Once connected to a Fabric gateway in the `Fabric Gateways` panel, right-click a transaction under an instantiated smart contract and click `Submit transaction`. This will submit a transaction to a smart contract.

<img src="client/media/submit_transaction.gif" with="85%" alt="Submit a transaction to a smart contract">

### Edit an existing blockchain connection
Gatways and their wallets can be edited by right-clicking and selecting `Edit Gateway` in the `Fabric Gateways` panel.  This will open User Settings, with the gateway available for editing.

<img src="client/media/edit_connection.gif" width="85%" alt="Edit an existing blockchain connection">

### Debugging a smart contract
Debugging your smart contract allows you to run through the smart contract transactions with breakpoints and output, to ensure your transaction works as intended. To debug your smart contract follow these steps:

1. Open your smart contract project, ensure you are connected to the `local_fabric` runtime and the `local_fabric` is in development mode.
2. Open the debug view in Visual Studio Code using the left-hand navigation bar.
3. Select the `Debug Smart Contract` configuration by using the dropdown in the upper-left.
4. Package and install the smart contract by clicking the **play** button.
5. Add breakpoints to the smart contract by clicking on the relevant line numbers in your smart contract files.
6. Click **Instantiate** in the `Local Fabric Ops` panel. In the `Fabric Gateways` panel, you can now right click on transactions to submit them, execution will be paused on any breakpoints you've defined.

To make iterative changes to your smart contract while debugging, after making your changes click the **restart** button. Restarting debugging means you don't need to instantiate the contract again. Please note, as this stores the smart contract in local memory, for many changes to large smart contracts, you may need to reinstantiate the smart contract.

## Connecting to your own Hyperledger Fabric instance

Using this extension, you can connect to a pre-configured local instance of Hyperledger Fabric named `local_fabric`, or you can connect to your own Hyperledger Fabric instance. If you choose to connect to your own Hyperledger Fabric instance, it must be running Hyperledger Fabric v1.4.0 or later. From v0.2.0+, you can use a file system wallet to import identities to connect with. Alternatively, provide a name, certificate and privateKey and the extension will generate a new file system wallet. In either case, this file system wallet can be used by your Blockchain applications. 

> ⚠ Please note: v0.3.0 has restructured fabric connections to fabric gateways, so you will need to add any connections created with previous releases again in order to use them. 

**When using the pre-configured local instance of Hyperledger Fabric named `local_fabric`, the extension will automatically pull and use the correct Docker images.**

If you want to start and connect to your own Hyperledger Fabric instance, ensure that you are using Hyperledger Fabric v1.4.0 or later by following the Fabric documentation here:

https://hyperledger-fabric.readthedocs.io/en/release-1.4/install.html

<img src="/client/media/add_new_connection.gif" width="85%" alt="Add a new connection">

## Supported Operating Systems

Linux, Mac OS, and Windows are currently the only supported operating systems for use with the extension.

## Telemetry Reporting

The extension uses telemetry reporting to track usage data and help improve future extension versions.

For instructions on how to disable telemetry reporting, please visit the visit the [Visual Studio Code FAQ](https://code.visualstudio.com/docs/supporting/FAQ#_how-to-disable-telemetry-reporting).

## Future Additions
To track the projects future features, visit [GitHub Issues](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues?q=is%3Aopen+is%3Aissue+label%3AEpic).

## License <a name="license"></a>
The source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.

This software uses the IBM Plex Sans font licensed under the SIL Open Font License, Version 1.1.
Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL
