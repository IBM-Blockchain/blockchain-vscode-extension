# IBM Blockchain Platform Extension updated to v1.0.28
_Release date: May 7th 2020_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Add an environment by connecting to IBM Blockchain Platform Console for IBM Cloud [#1333](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1333).
 > When adding an environment, selecting ‘Add an IBM Blockchain Platform network’ will now let you discover nodes from your IBM Blockchain Platform Console for IBM Cloud instance.

* New developer tutorials and updated tutorial view [#1197](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1197).
 > There are 10 new tutorials that will take you through core concepts, preparing you to take the IBM Blockchain Essentials and IBM Blockchain Foundation Developer courses and hopefully earn the badges!
 > 
 > These tutorials cover topics such as:
 > -	Introduction to Blockchain
 > -	Creating a smart contract
 > -	Deploying a smart contract
 > -	Invoking a smart contract from VS Code
 > -	Invoking a smart contract from an external application
 > -	Upgrading a smart contract
 > -	Debugging a smart contract
 > -	Testing a smart contract
 > -	Publishing an event 
 > -	Recap and additional resources

Fixes
---
* Fixed ‘Webview is disposed’ when attempting to open a closed webview in VS Code 1.44.x [#2234](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2234).

* Updated code-server support and instructions [#2236](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2236).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-72.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).