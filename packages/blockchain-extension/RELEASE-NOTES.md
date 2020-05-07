# IBM Blockchain Platform Extension updated to v1.0.27
_Release date: April 23rd 2020_

Announcements
---

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >v1.4
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
<<<<<<< HEAD
* Group gateways and wallets into folders based on the environment they're related to [#1865](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1865).
=======
* Add an environment by connecting to IBM Blockchain Platform Console for IBM Cloud [#1333](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1333).
 > When adding an environment, selecting ‘Add an IBM Blockchain Platform network’ will now let you discover nodes from your IBM Blockchain Platform Console for IBM Cloud instance.

* New developer tutorials and updated tutorial view [#1197](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1197).
 > There are 10 new tutorials (written by the team who run IBM’s developer labs and create official blockchain certifications) that will take you through core concepts, preparing you to take the IBM Blockchain Essentials and IBM Blockchain Foundation Developer courses and hopefully earn the badges!
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
>>>>>>> 194fff9a... Amended changelog (#2277)

Fixes
---
* Fixed JDK popup appearing on Mac when checking prerequisites [#1657](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1657).

* Fixed "Cannot read property 'major' of null" error on activation [#2200](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2200).

* Fixed TypeScript contract packaging failing on VS Code 1.44.x [#2193](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2193).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-71.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).