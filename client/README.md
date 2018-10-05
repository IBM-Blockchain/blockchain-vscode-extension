# IBM Blockchain Platform Extension for VSCode
<!---Installing instructions
--->
<!---Short description of what the extension allows the user to do and key features in bullet points below 
--->
The IBM Blockchain Platform extension has been created to assist users in developing, testing, and deploying smart contracts; including connecting to live Hyperledger Fabric environments.

## Requirements

You will need the following installed in order to start a local Hyperledger Fabric runtime from within the extension:
- [Node v8.x or greater and npm v5.x or greater](https://nodejs.org/en/download/)

- [Yeoman (yo) v2.x](http://yeoman.io/)
- [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
- [Docker Compose v1.14.0 or greater](https://docs.docker.com/compose/install/)

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

<img src="https://github.com/IBM-Blockchain/blockchain-vscode-extension/blob/master/client/media/start_new_project_small.gif" width="85%" alt="Start a new Fabric smart contract project">
<!---Link to docs with further instructions
--->

### Edit / write smart contract files
<!---Short explanation with code-blocks
--->

<img src="https://github.com/IBM-Blockchain/blockchain-vscode-extension/blob/master/client/media/edit_write_files.png" width="85%" alt="Edit smart contract files">
<!---Link to docs with further instructions
--->

### Package a smart contract project

<img src="https://github.com/IBM-Blockchain/blockchain-vscode-extension/blob/master/client/media/package_project.png" width="85%" alt="Create a package from a smart contract project">


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

<img src="https://github.com/IBM-Blockchain/blockchain-vscode-extension/blob/master/client/media/connect_to_local_fabric_runtime_small.gif" width="90%" alt="Connect to local_fabric runtime">

<!---Short explanation with code-blocks
--->
<!---Screenshot of UI/Video of prototype click-through 
--->
<!---Link to docs with further instructions
--->
### Connect to a specified (remote) Fabric runtime and discover the existing resources
<!---Short explanation with code-blocks
--->

<img src="https://github.com/IBM-Blockchain/blockchain-vscode-extension/blob/master/client/media/discover_resources.png" width="40%" alt="Connect to the network and discover the existing resources">
<!---Link to docs with further instructions
--->

### Install smart contract package
<!---Short explanation with code-blocks
--->

<img src="https://github.com/IBM-Blockchain/blockchain-vscode-extension/blob/master/client/media/install_smart_contract.png" width="60%" alt="Install new smart contract">

<!---Link to docs with further instructions
--->

### Instantiate smart contract package
<!---Short explanation with code-blocks
--->

<img src="https://github.com/IBM-Blockchain/blockchain-vscode-extension/blob/master/client/media/instantiate_small.gif" width="85%" alt="Instantiate new smart contract">


## Connecting to your own Hyperledger Fabric instance

Using this extension, you can connect to a pre-configured local instance of Hyperledger Fabric named `local_fabric`, or you can connect to your own Hyperledger Fabric instance. If you choose to connect to your own Hyperledger Fabric instance, it must be running Hyperledger Fabric v1.3.0 or later.

**When using the pre-configured local instance of Hyperledger Fabric named `local_fabric`, the extension will automatically pull and use the correct Docker images.**

If you want to start and connect to your own Hyperledger Fabric instance, ensure that you are using Hyperledger Fabric v1.3.0 or later by following the Fabric documentation here:

https://hyperledger-fabric.readthedocs.io/en/v1.3.0-rc1/install.html

## Supported Operating Systems 

Linux and Mac OS are currently the only supported operating systems for use with the extension.

The work to implement Windows support can be tracked in [Issue 72](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/72).


## Telemetry Reporting

The extension uses telemetry reporting to track usage data and help improve future extension versions.

For instructions on how to disable telemetry reporting, please visit the visit the [Visual Studio Code FAQ](https://code.visualstudio.com/docs/supporting/FAQ#_how-to-disable-telemetry-reporting).

## Future Additions
To track the projects future features, visit [GitHub Issues](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues?q=is%3Aopen+is%3Aissue+label%3AEpic).

## License <a name="license"></a>
The source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the [LICENSE](LICENSE.txt) file.
