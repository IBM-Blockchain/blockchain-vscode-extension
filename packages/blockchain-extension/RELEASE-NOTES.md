# IBM Blockchain Platform Extension updated to v2.0.0-rc.1
_Release date: December 17th 2020_

Announcements
---

* **VS Code v1.40 or greater is now the minimum version required for using the v2.0.0 version of the extension.**

Features & Enhancements
---
* Support for Fabric v2.0 lifecycle.
 > This extension now support all operations required to deploy smart contracts to a Fabric V2 channel.
 >
 > When creating a new local environment, you now have the option to specify the capabilities of the channel to be created.
 >
 > To use the new Fabric v2.0 lifecycle you need to create a local environment which has V2 capabilities.
 >
 > Be sure to check out the updated 'Basic tutorials' to find out how to use the new lifecycle.
* New 'Deploy Smart Contract' command
 > We've included a new 'Deploy Smart Contract' command which is callable from the command palette.
 >
 > This command allows you to easily install and instantiate a smart contract (if using a V1 channel), or install, approve and commit a smart contract (if using a V2 channel) - using a single action.
* New 'Transact with Smart Contract' command
 > We've included a new 'Transact with Smart Contract' command which makes it easier to submit/evaluate transactions.

Fixes
---
* No longer need to rebuild gRPC [#1621](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621)

Be sure to take a look at our previous 2.0.0-beta.x releases in the changelog to see the full list of changes made.

Notes
---
* Smart contract debugging is unavailable [#2660](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2660)

This release's Conga Comic:	
---	
<img src="https://congacomic.github.io/assets/img/blockheight-82.jpg" width="800">	

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).
