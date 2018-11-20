# IBM Blockchain Platform Extension for VSCode

[![Version](https://vsmarketplacebadge.apphb.com/version/IBMBlockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Installs](https://vsmarketplacebadge.apphb.com/installs/IBMBLockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Build Status](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension.svg?branch=master)](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension) [![Build status](https://ci.appveyor.com/api/projects/status/pvipa2bkvl4ilita?svg=true)](https://ci.appveyor.com/project/sstone1/blockchain-vscode-extension-gi6xr)

The IBM Blockchain Platform extension has been created to assist users in developing, testing, and deploying smart contracts; including connecting to Hyperledger Fabric environments.

> ⚠ Please note: this extension is available for early experimentation.  There are many features and improvements to come before the v1.0 release.  Please bear this in mind, and if you find something you'd like to see added, let the team know by raising a GitHub issue or suggestion (see "Contact Us" below).

## Contact Us
If you have find any problems or want to make suggestions for future features please create [issues and suggestions on Github](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues)

## Requirements

You will need the following installed in order to use the extension:
- [VSCode version 1.26 or greater](https://code.visualstudio.com)
- [Node v8.x or greater and npm v5.x or greater](https://nodejs.org/en/download/)
- [Yeoman (yo) v2.x](http://yeoman.io/)
- [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
- [Docker Compose v1.14.0 or greater](https://docs.docker.com/compose/install/)

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
| Add Connection | Add a Hyperledger Fabric instance connection |
| Add Identity To Connection | Add an identity to be used when connecting to a Hyperledger Fabric instance  |
| Connect To Blockchain | Connect to a Hyperledger Fabric blockchain using a blockchain connection |
| Create Smart Contract Project | Create a new JavaScript or TypeScript smart contract project |
| Debug | Debug a Smart Contract |
| Delete Connection | Delete a Hyperledger Fabric instance connection |
| Delete Package | Delete a smart contract package |
| Disconnect From Blockchain | Disconnect from the blockchain you're currently connected to |
| Edit Connection | Edit connection to a blockchain |
| Export Package | Export an already-packaged smart contract package to use outside VSCode |
| Generate Smart Contract Tests | Create a functional level test file for instantiated smart contracts |
| Install Smart Contract | Install a smart contract package onto a peer |
| Instantiate Smart Contract | Instantiate an installed smart contract package onto a channel<br>**Note: This currently doesn't work with IBM Blockchain Platform Enterprise plan - Coming soon!* |
| Open Fabric Runtime Terminal | Open a terminal with access to the Fabric runtime (peer CLI) |
| Package a Smart Contract Project | Create a new smart contract package from a project in the Explorer|
| Refresh Blockchain Connections | Refresh the Blockchain Connections view |
| Refresh Smart Contract Packages | Refresh the Smart Contract Packages view |
| Restart Fabric Runtime | Restart a Hyperledger Fabric instance |
| Start Fabric Runtime | Start a Hyperledger Fabric instance |
| Submit Transaction | Submit a transaction to a smart contract |
| Teardown Fabric Runtime | Teardown the local_fabric runtime (hard reset) |
| Toggle Development Mode | Toggle the Hyperledger Fabric instance development mode |
| Upgrade Smart Contract | Upgrade an instantiated smart contract |

## Smart Contract Development Lifecycle
_Please note that all operations shown are also possible using the commands in the table above, issued at the VSCode command-prompt._

### Create a Fabric smart contract project
Use the `Create Smart Contract Project` command to start a new project. Select from the available smart contract programming languages. Choose a directory to store the project (or create a new one). A skeleton project will be generated with a very basic smart contract, unit tests, a `package.json` and other useful files.

![Start a new Fabric smart contract project](client/media/start_new_project_small.gif)


### Edit / write smart contract files
You'll find the smart contract file in the `lib` directory of a newly generated project.

![Edit smart contract files](client/media/edit_write_files.png)


### Package a smart contract project
To package a project you have open in your workspace, run the `Package a Smart Contract Package` command. Packages will be added to the `Smart Contract Packages` panel in the explorer view.

Alternatively, navigate to the explorer view (click the IBM Blockchain Platform icon in the left-navigation) then click the `add` icon (this will again package up the project you have open in your workspace).

![Create a package from a smart contract project](client/media/package_project.png)

### Export a smart contract package
Right-click a package and select the `Export Package` option.  You can select where the package is exported to. Use this to take the packages you have made and deploy them somewhere else.

![Export a package from a smart contract project](client/media/export_smart_contract_package.png)


### Connect to local_fabric runtime
The `local_fabric` runtime can be enabled by left-clicking it in the `Blockchain Connections` panel. The first time you enable it, Fabric images will be installed.  
Left-click to connect to `local_fabric` when it is enabled. Right-click the connection for management options (including start/stop, teardown and toggle dev mode).

![Connect to local_fabric runtime](client/media/connect_to_local_fabric_runtime_small.gif)


### Teardown the local_fabric runtime
When you start/stop the local_fabric, all data will be maintained. To completely teardown the runtime and start over, right-click `local_fabric` in the `Blockchain Connections` view and choose `Teardown Fabric Runtime` (you must then confirm this action).

![Teardown the local_fabric runtime](client/media/teardown_fabric_runtime.gif)

### Connect to a specified (remote) Fabric runtime and discover the existing resources
Left-click a connection to activate connect to the blockchain runtime it represents. Expand the sections in the navigation tree to explore its resources. When you're done, use the "back" icon in the section's header-bar to disconnect.

![Connect to the network and discover the existing resources](client/media/discover_resources.png)


### Install smart contract package
Smart contract packages are installed on Fabric peers.  Find a peer by connecting to a blockchain network, then right-click and select `Install Smart Contract`.

![Install smart contract](client/media/install_smart_contract.png)


### Instantiate smart contract package
Smart contract packages are instantiated on Fabric channels.  Find a channel by connecting to a blockchain network, then right-click and select `Instantiate / Upgrade Smart Contract`. You will be offered a list of the smart contracts that are installed on peers in the channel.

It is useful to think of installing on peers as the first step and instantiating on a channel as the second step of deploying a smart contract package.

![Instantiate smart contract](client/media/instantiate_small.gif)

### Submit transaction
Right click a transaction and click **Submit transaction**. This will submit a transaction to a smart contract.

![Submit transaction](client/media/submit_transaction.gif)

### Edit an existing blockchain connection
Connections can be edited by right-clicking and selecting `Edit Connection`.  This will open User Settings, with the connection available for editing.

![Edit blockchain connection](client/media/edit_connection.gif)

### Debugging a smart contract
Debugging your smart contract allows you to run through the smart contract transactions with breakpoints and output, to ensure your transaction works as intended. To debug your smart contract follow these steps:

1. Open your smart contract project, ensure you are connected to the `local_fabric` connection and the `local_fabric` is in development mode.
2. Open the debug view in Visual Studio Code using the left-hand navigation bar.
3. Select the `Debug Smart Contract` configuration by using the dropdown in the upper-left.
4. Package and install the smart contract by clicking the **play** button.
5. Add breakpoints to the smart contract by clicking on the relevant line numbers in your smart contract files.
6. Right-click on the installed smart contract and click **Instantiate**. You can now right click on transactions to submit them, execution will be paused on any breakpoints you've defined.

To make iterative changes to your smart contract while debugging, after making your changes click the **restart** button. Restarting debugging means you don't need to instantiate the contract again. Please note, as this stores the smart contract in local memory, for many changes to large smart contracts, you may need to reinstantiate the smart contract.

## Connecting to your own Hyperledger Fabric instance

Using this extension, you can connect to a pre-configured local instance of Hyperledger Fabric named `local_fabric`, or you can connect to your own Hyperledger Fabric instance. If you choose to connect to your own Hyperledger Fabric instance, it must be running Hyperledger Fabric v1.3.0 or later.

**When using the pre-configured local instance of Hyperledger Fabric named `local_fabric`, the extension will automatically pull and use the correct Docker images.**

If you want to start and connect to your own Hyperledger Fabric instance, ensure that you are using Hyperledger Fabric v1.3.0 or later by following the Fabric documentation here:

https://hyperledger-fabric.readthedocs.io/en/release-1.3/install.html

![Add blockchain connection](client/media/add_new_connection.gif)

## Supported Operating Systems

Linux, Mac OS, and Windows are currently the only supported operating systems for use with the extension.

## Telemetry Reporting

The extension uses telemetry reporting to track usage data and help improve future extension versions.

For instructions on how to disable telemetry reporting, please visit the visit the [Visual Studio Code FAQ](https://code.visualstudio.com/docs/supporting/FAQ#_how-to-disable-telemetry-reporting).

## Future Additions
To track the projects future features, visit [GitHub Issues](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues?q=is%3Aopen+is%3Aissue+label%3AEpic).

## License <a name="license"></a>
The source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE.txt) file.
