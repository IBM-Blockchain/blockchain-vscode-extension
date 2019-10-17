# IBM Blockchain Platform Extension for VS Code

[![Version](https://vsmarketplacebadge.apphb.com/version/IBMBlockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) [![Installs](https://vsmarketplacebadge.apphb.com/installs/IBMBLockchain.ibm-blockchain-platform.svg)](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform)

The IBM Blockchain Platform extension helps developers to create, test and debug smart contracts, connect to Hyperledger Fabric environments, and build applications that transact on your blockchain network.

For a step-by-step guide on getting started with the extension's features, access our Beginner Tutorial via our integrated Home page. Alternatively, explore, clone and open the Hyperledger Fabric samples, all without leaving VS Code. For more comprehensive documentation, [follow this link](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-develop-vscode)

![IBP Extension Homepage](media/VSCodeImage.png)

## Installation

Please visit the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=IBMBlockchain.ibm-blockchain-platform) for installation and more details.

## Requirements

You will need the following installed in order to use the extension:
- Windows 10, Linux, or Mac OS are currently the supported operating systems.
- [VS Code version 1.32 or greater](https://code.visualstudio.com)
- [Node v8.x or v10.x and npm v6.x or greater](https://nodejs.org/en/download/)
- [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
- [Docker Compose v1.14.0 or greater](https://docs.docker.com/compose/install/)
- [Go version v1.12 or greater for developing Go contracts](https://golang.org/dl/)
- [Java v8 for developing Java contracts](https://adoptopenjdk.net/?variant=openjdk8)

If you are using Windows, you must also ensure the following:
- You are using Windows 10 Pro or Enterprise and have the Anniversary Update 1607
- Docker for Windows is configured to use Linux containers (this is the default)
- You have installed the C++ Build Tools for Windows from [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools#windows-build-tools)
- You have installed OpenSSL v1.0.2 if using Node 8, or v1.1.1 if using Node 10 from [Win32 OpenSSL](http://slproweb.com/products/Win32OpenSSL.html)
  - Install the normal version, not the version marked as "light"
  - Install the Win32 version into `C:\OpenSSL-Win32` on 32-bit systems
  - Install the Win64 version into `C:\OpenSSL-Win64` on 64-bit systems

You can check your installed versions by running the following commands from a terminal:
- `node --version`
- `npm --version`
- `docker --version`
- `docker-compose --version`
- `go version`
- `java -version`

**If installing Node and npm using a manager such as 'nvm' or 'nodenv', you will need to set the default/global version and restart VS Code for the version to be detected by the Prerequisites page.**

To open the Prerequisites page again, run the following in the command palette: `View Prerequisites`

Please note: the extension doesn't currently work with the VSCode Remote Development feature, we plan to make this work in the future, follow progress [here](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1357). 

## Smart Contract Development Lifecycle
_Please note that all commands contributed by this extension are accessible via the VS Code Command Palette. The commands outlined below are available from burger menus located on the panel headers, or by right-clicking tree items, in the extension's side bar view._

The expected smart contract development lifecycle follows several broad points, all possible entirely within VS Code using this extension:
1. Creating and packaging a smart contract
2. Connecting to an instance of Hyperledger Fabric
3. Running and debugging a smart contract
4. Submitting transactions and generating functional-level smart contract tests

### Create and Develop a Fabric smart contract project
A smart contract project is a directory containing all the relevant contract and metadata files that define a smart contract. Use the `Create New Project` command to create a basic smart contract, available in JavaScript, TypeScript, Go or Java.

### Package Open Project
To package a project you have open in your workspace, run the `Package Open Project` command. Packages are listed in the `Smart Contracts` panel. The `Blockchain` output channel lists what files have been packaged during this action. Alternatively run the `Import a Package` command to import a pre-existing .cds package to be used within VS Code.

If you wish to control which files in the project are packaged, you can create a `.fabricignore` file in the top level directory of your smart contract project. The file and pattern format for a `.fabricignore` file is the same as a [`.gitignore`](https://git-scm.com/docs/gitignore) file, for example:

```
/.classpath
/.git/
/.gradle/
/.project
/.settings/
/bin/
/build/
```

### Connecting to an instance of Hyperledger Fabric
#### Local Fabric
The extension contains a pre-configured local instance of Hyperledger Fabric named `Local Fabric`, which the extension will automatically pull and use the correct Docker images for. It is a pre-configured network with one organization, one peer and one channel. It can be enabled and operated under the `Fabric Environments` panel. The first time it is started, Fabric images will be installed and an admin identity created in the `Local Fabric Wallet` wallet.

For `Local Fabric` management tasks such as restart and teardown, right click on `Local Fabric` in the `Fabric Environments` panel.

#### Connecting to another instance of Hyperledger Fabric
The extension allow you to connect to any Hyperledger Fabric instance and perform some operational tasks. The tasks available are: install, instantiate and registering and enrolling identities.

To connect to a Hyperledger Fabric instance on the `Fabric Environments` panel click the `+` button. This will ask you for JSON node files that describe how to connect to a Hyperledger Fabric Node i.e. peer, orderer, or certificate authority.

If you are connecting to an instance of IBM Blockchain platform the JSON node files can be exported from the operational console, (see the tutorials for more information). For other instances of Hyperledger Fabric you can create the JSON node files yourself.

##### JSON Node Files
All node files must contain a `name`, `type`, and `api_url` property. There are three types: `fabric-peer`, `fabric-ca` and `fabric-orderer`. `Peer` and `Orderer` nodes must also contain an `msp_id` property. While `Certificate Authority` nodes must contain a `ca_name` property. If you have `TLS` enabled then then the `pem` property must also be set.

There are also some additional optional properties. `peer` and `orderer` nodes can set the property `ssl_target_name_overide`, this will override the hostname used to verify the servers TLS certificate. A `certificate authority` node can contain the properties `enroll_id` and `enroll_secret`, these properties are used for identity to connect to the certificate authority. If you have a `multi-node ordering service` then on each `orderer` node the `cluster_name` property can be set. If this property is set then the `orderer` nodes in the same cluster will be grouped together.
A JSON node file can contain more than one node definition using array syntax

Here are some examples of node files:

These some basic examples showing the required properties

```
{
    "name": "ca.org1.example.com",
    "api_url": "http://localhost:17054",
    "type": "fabric-ca",
    "ca_name": "ca.org1.example.com"
}
```

```
{
    "name": "peer0.org1.example.com",
    "api_url": "grpc://localhost:17051",
    "type": "fabric-peer",
    "msp_id": "Org1MSP"
}
```

```
{
    "name": "orderer.example.com",
    "api_url": "grpc://localhost:17050",
    "type": "fabric-orderer",
    "msp_id": "OrdererMSP"
}
```

Here is how to have multiple nodes in one JSON file

```
[
    {
        "name": "peer0.org1.example.com",
        "api_url": "grpc://localhost:17051",
        "type": "fabric-peer",
        "msp_id": "Org1MSP"
    },
    {
        "name": "orderer.example.com",
        "api_url": "grpc://localhost:17050",
        "type": "fabric-orderer",
        "msp_id": "OrdererMSP"
    }
]

```

Here is a certificate authority with `enroll_id` and `enroll_secret` set

```
{
   "name": "ca.org1.example.com",
   "api_url": "http://localhost:17054",
   "type": "fabric-ca",
   "ca_name": "ca.org1.example.com",
   "enroll_id": "admin",
   "enroll_secret": "adminpw"
}
```

Here is an example of a multi-node ordering service

```
[
    {
         "name": "orderer.example.com",
         "api_url": "grpc://localhost:17050",
         "type": "fabric-orderer",
         "msp_id": "OrdererMSP",
         "cluster_name": "myCluster"
     },
     {
          "name": "orderer1.example.com",
          "api_url": "grpc://localhost:17051",
          "type": "fabric-orderer",
          "msp_id": "OrdererMSP",
          "cluster_name": "myCluster"
     }
]
```

Here is an example of a peer with `TLS` enabled, please note the `pem` property value has been shortened. The `pem` property is the root `TLS` certificate of the peer's MSP. The property should be base64 encoded from a pem file. 

```
{
    "name": "peer0.org1.example.com",
    "api_url": "grpcs://localhost:17051",
    "type": "fabric-peer",
    "msp_id": "Org1MSP",
    "pem": "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNJVENDQWNpZ0F3"
 }
```

If you already have a wallet in the extension with the identity you want to use for a node, you can set the `wallet` and `identity` properties. Setting both the properties would skip the setup step for that node. For example if you had the wallet `myWallet` with identity `myIdentity` you could do the following:
```
{
    "name": "peer0.org1.example.com",
    "api_url": "grpc://localhost:17051",
    "type": "fabric-peer",
    "msp_id": "Org1MSP",
    "wallet": "myWallet",
    "identity": "myIdentity"
}
```


##### Associating identities with nodes
After creating an environment, the next step before connecting is to associate an identity with each node. To do this, click the name of the environment you have just created in the Fabric Environments panel. To complete setup, click on each node from the list to associate an identity with them. The identity must be an admin identity for the node. To change the identity associated with a node when connected the environment, right-click on the node and select Replace identity associated with a node.

##### Importing more nodes
You can import more nodes to an existing environment by connecting to the environment, expand `nodes` and then click on `+ Import nodes`. 

### Install and Instantiate smart contract packages
Deploying a smart contract package is a two step process: install the package on a peer and instantiate it on a channel. Run the `Install Smart Contract` command, followed by the `Instantiate Smart Contract` command to deploy your smart contract package on the `Local Fabric` runtime. The deployed smart contracts are listed in the `Fabric Environments` panel.

### Debugging a smart contract
Debugging your smart contract allows you to run through the smart contract transactions with breakpoints and output, to ensure your transaction works as intended. ***Note: This is only currently available for the Local Fabric, remote debug is not currently available***

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

1. Ensure you are connected to the `Local Fabric` runtime.
2. Open your smart contract project in your workspace.
3. Open the debug view in Visual Studio Code using the left-hand navigation bar.
4. Select the `Debug Smart Contract` configuration by using the dropdown in the upper-left and click the **play** button on the debug toolbar. The extension will automatically instantiate or upgrade the smart contract as appropriate. If you want to test out a function that is called on instantiate or upgrade add the following to the launch configuration, where `name` is the name of the smart contract and `version` is different to the previous version used. Alternatively if you are using JavaScript or TypeScript then you can update the `version` in the package.json file.

```
    "env": {
        "CORE_CHAINCODE_ID_NAME": <name>:<version>
    }
```

5. Add breakpoints to the smart contract by clicking on the relevant line numbers in your smart contract files.
6. To submit or evaluate a transaction, click the blockchain icon on the debug toolbar. Alternatively, in the `Fabric Gateways` panel, you can right click on transactions to submit or evaluate them. Execution will be paused on any breakpoints you've defined.

#### Making changes to your contract while debugging
To make iterative changes to your smart contract while debugging, after making your changes click the **restart** button. You can also stop the debugging session, make further changes and start debugging again, without needing to upgrade your smart contract.

### Add a gateway to establishing a client connection to your own Hyperledger Fabric instance
To connect to our own Hyperledger Fabric instance, it must be running [Hyperledger Fabric v1.4.1](https://hyperledger-fabric.readthedocs.io/en/release-1.4/install.html) or later.

Add your gateway by providing a name and connection profile via the `Add Gateway` command; it will be listed in the `Fabric Gateways` panel. Add a file system wallet to connect to your gateway with via the `Add Wallet` command.

You can also create a gateway from a fabric environment. When you run the `Add Gateway` command there will be an option to create a gateway from a fabric environment, select this then choose the environment you want to create the gateway from.

### Connect to a gateway and discover its resources
Connect by clicking on a gateway in the `Fabric Gateways` panel, and expand the navigation tree to explore its resources. Instantiated Smart Contracts are listed under the channel and from here you can generate functional-level test files on single or multiple smart contracts (Currently you cannot generate Java functional tests). Submit or evaluate individual transactions listed under the instantiated smart contracts, with the result displayed in the `Blockchain` output channel.

### Wallet Management
The extension creates a `Local Fabric Wallet` file system wallet when it is installed, which is used to connect to the `Local Fabric` runtime instance and is automatically associated with that gateway. When `Local Fabric` is started, an admin identity is added to the `Local Fabric Wallet` and cannot be deleted unless the `Local Fabric` runtime is torn down.

The `Add Identity to Wallet` command will ask for a name, MSPID and a method to add an identity. These methods include providing a certificate and private key, a JSON identity file, or a gateway, enrollment id and secret.

For wallets associated with other remote Fabric gateways, the `Add Wallet`, `Export Wallet` and `Remove Wallet` commands are available in the `Fabric Wallets` panel for wallet management.

### Creating an identity with attributes
Identities can be registered and enrolled with attributes from the `Local Fabric` certificate authority.

The `Create Identity (register and enroll)` command will ask for an identity name and whether the identity should have any attributes added.
Selecting `Yes` will ask for the identity's attributes that should be provided in the following format:

```
[{"name": "attr1", "value": "attr1value", "ecert": true}, {"name": "attr2", "value": "attr2value", "ecert": true}]
```

The key `ecert` must be set to true in order for a smart contract to be able to read the value of the attribute using ['getAttributeValue'](https://fabric-shim.github.io/release-1.4/fabric-shim.ClientIdentity.html#getAttributeValue).

Hovering over an identity in the `Fabric Wallets` panel will show any attributes associated with the identity.

### Changing transaction timeout values

In the extension, the default timeout value for transactions is 120 seconds.
However, when debugging a transaction it might be necessary to change the time taken before a transaction fails.

The following settings can be changed in the user settings to increase or decrease the time taken for a transaction to timeout:
- `ibm-blockchain-platform.fabric.client.timeout` - timeout value used for communication to the peers and orderers (changes `request-timeout`)
- `ibm-blockchain-platform.fabric.chaincode.timeout` - timeout value for chaincode that's been started by the Local Fabric (changes `CORE_CHAINCODE_EXECUTETIMEOUT`)

***Note: If the value of `ibm-blockchain-platform.fabric.client.timeout` is changed, you must disconnect from a connected gateway before the new value takes affect***

***Note: If the value of `ibm-blockchain-platform.fabric.chaincode.timeout` is changed, you must restart the Local Fabric before the new value takes affect***

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
| Associate Identity with a Node | Associate an identity with a node to enable the extension to connect to that node |
| Connect Via Gateway | Connect to a Hyperledger Fabric instance using a gateway |
| Create New Project | Create a new smart contract project |
| Create Identity (register and enroll) | Create, register and enroll a new identity from the Local Fabric runtime certificate authority |
| Debug | Debug a Smart Contract |
| Delete Environment | Delete a Hyperledger Fabric instance environment |
| Delete Identity | Delete an identity from a wallet |
| Delete Gateway | Delete a Hyperledger Fabric instance gateway |
| Delete Package | Delete a smart contract package |
| Disassociate A Wallet | Remove the association between a wallet and a gateway |
| Disconnect From Environment | Disconnect from the environment you're currently connected to |
| Disconnect From Gateway | Disconnect from the blockchain gateway you're currently connected to |
| Evaluate Transaction | Evaluate a smart contract transaction |
| Export Connection Profile | Export connection profile for a blockchain gateway |
| Export Package | Export a smart contract package to use outside VS Code |
| Export Wallet | Export a wallet to use outside VS Code |
| Generate Smart Contract Tests | Create functional level test files for single or multiple contracts |
| Import a Package | Import a smart contract package |
| Import nodes into environment | Import more nodes into an environment |
| Install Smart Contract | Install a smart contract package onto a Local Fabric runtime peer |
| Instantiate Smart Contract | Instantiate an installed smart contract package onto a channel |
| Open New Terminal | Open a new terminal on a specified Fabric node (peer, orderer, and fabric-ca-client CLIs) |
| Package Open Project | Create a new smart contract package from a project in the Explorer |
| Remove Wallet | Remove a wallet from the Fabric Wallets view |
| Replace Identity Associated with a Node | Replace which identity is associated with a node |
| Restart Fabric Runtime | Restart the Local Fabric instance |
| Start Fabric Runtime | Start the Local Fabric instance |
| Stop Fabric Runtime | Stop the Local Fabric instance |
| Submit Transaction | Submit a transaction to a smart contract |
| Teardown Fabric Runtime | Teardown the Local Fabric runtime (hard reset) |
| Upgrade Smart Contract | Upgrade an instantiated smart contract |
| View Homepage | View the extensions homepage |
| View Prerequisites | View the required and optional dependencies on the prerequisites page |

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
