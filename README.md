# IBM Blockchain Platform Extension for VSCode

[![Version](https://vsmarketplacebadge.apphb.com/version/IBMBlockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Installs](https://vsmarketplacebadge.apphb.com/installs/IBMBLockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Build Status](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension.svg?branch=master)](https://travis-ci.org/IBM-Blockchain/blockchain-vscode-extension) [![Build status](https://ci.appveyor.com/api/projects/status/pvipa2bkvl4ilita?svg=true)](https://ci.appveyor.com/project/sstone1/blockchain-vscode-extension-gi6xr)

The IBM Blockchain Platform extension has been created to assist users in developing, testing, and deploying smart contracts; including connecting to Hyperledger Fabric environments.

## Contact Us
If you have find any problems or want to make suggestions for future features please create [issues and suggestions on Github](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues)

<!---Installing instructions
--->
<!---Short description of what the extension allows the user to do and key features in bullet points below 
--->

## Installation

**[Install the IBM Blockchain Platform extension here](vscode:extension/IBMBlockchain.ibm-blockchain-platform)**


Or visit the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) for more details

## Requirements

You will need the following installed in order to start a local Hyperledger Fabric runtime from within the extension:
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
| Delete Connection | Delete a Hyperledger Fabric instance connection |
| Delete Package | Delete a smart contract package |
| Disconnect From Blockchain | Disconnect from the blockchain you're currently connected to |
| Install Smart Contract | Install a smart contract package onto a peer |
| Instantiate Smart Contract | Instantiate an installed smart contract package onto a channel<br>**Note: This currently doesn't work with IBM Blockchain Platform Starter Plan and Enterprise plan - Coming soon!*|
| Package a Smart Contract Project | Create a new smart contract package from a project in the Explorer|
| Refresh Blockchain Connections | Refresh the Blockchain Connections view |
| Refresh Smart Contract Packages | Refresh the Smart Contract Packages view |
| Restart Fabric Runtime | Restart a Hyperledger Fabric instance |
| Start Fabric Runtime | Start a Hyperledger Fabric instance |
| Toggle Development Mode | Toggle the Hyperledger Fabric instance development mode |

## Smart Contract Development Lifecycle
<!---Things you can do in the Explorer view once the extension is installed
--->
### Create a Fabric smart contract project
<!---Short explanation with code-blocks
--->

<img src="/client/media/start_new_project_small.gif" width="85%" alt="Start a new Fabric smart contract project">
<!---Link to docs with further instructions
--->

### Edit / write smart contract files
<!---Short explanation with code-blocks
--->

<img src="/client/media/edit_write_files.png" width="85%" alt="Edit smart contract files" width="85%" alt="Edit smart contract files">
<!---Link to docs with further instructions
--->

### Package a smart contract project

<img src="/client/media/package_project.png" width="85%" alt="Create a package from a smart contract project">


<!---Short explanation with code-blocks
--->
<!---Screenshot of UI/Video of prototype click-through 
--->
<!---Link to docs with further instructions
--->

<!---Things you can do in the Fabric view once the extension is installed
--->
<!---Introduction to Fabric view
--->
### Connect to local_fabric runtime

<img src="/client/media/connect_to_local_fabric_runtime_small.gif" width="90%" alt="Connect to local_fabric runtime" width="85%" alt="Connect to local_fabric runtime">

<!---Short explanation with code-blocks
--->
<!---Screenshot of UI/Video of prototype click-through 
--->
<!---Link to docs with further instructions
--->
### Connect to a specified (remote) Fabric runtime and discover the existing resources
<!---Short explanation with code-blocks
--->

<img src="/client/media/discover_resources.png" width="85%" alt="Connect to the network and discover the existing resources">
<!---Link to docs with further instructions
--->

### Install smart contract package
<!---Short explanation with code-blocks
--->

<img src="/client/media/install_smart_contract.png" width="85%" alt="Install new smart contract">

<!---Link to docs with further instructions
--->

### Instantiate smart contract package
<!---Short explanation with code-blocks
--->

<img src="/client/media/instantiate_small.gif" width="85%" alt="Instantiate new smart contract">


## Connecting to your own Hyperledger Fabric instance

Using this extension, you can connect to a pre-configured local instance of Hyperledger Fabric named `local_fabric`, or you can connect to your own Hyperledger Fabric instance. If you choose to connect to your own Hyperledger Fabric instance, it must be running Hyperledger Fabric v1.3.0 or later.

**When using the pre-configured local instance of Hyperledger Fabric named `local_fabric`, the extension will automatically pull and use the correct Docker images.**

If you want to start and connect to your own Hyperledger Fabric instance, ensure that you are using Hyperledger Fabric v1.3.0 or later by following the Fabric documentation here:

https://hyperledger-fabric.readthedocs.io/en/release-1.3/install.html

## Supported Operating Systems 

Linux, Mac OS, and Windows are currently the only supported operating systems for use with the extension.

## Telemetry Reporting

The extension uses telemetry reporting to track usage data and help improve future extension versions.

For instructions on how to disable telemetry reporting, please visit the visit the [Visual Studio Code FAQ](https://code.visualstudio.com/docs/supporting/FAQ#_how-to-disable-telemetry-reporting).

## Future Additions
To track the projects future features, visit [GitHub Issues](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues?q=is%3Aopen+is%3Aissue+label%3AEpic).

## License <a name="license"></a>
The source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE) file.
