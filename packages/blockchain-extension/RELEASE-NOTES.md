# IBM Blockchain Platform Extension updated to v1.0.19
_Release date: February 10th 2020_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

Features & Enhancements
---
* Ability to use transaction data files to make submitting transactions easier [#1822](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1822) [#1823](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1823) [#1801](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1801).
   > It’s now possible to create transaction data files, removing the need to manually type in arguments every time you submit a transaction.
   >
   > For information on how to write and use transaction data files, check out the [README](https://github.com/IBM-Blockchain/blockchain-vscode-extension#using-transaction-data-files-to-submit-a-transaction).

* Ability to add an environment by connecting to a IBM Blockchain Platform console software instance [#1334](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1334) [#1335](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1335).
   > In addition to this we are currently working on making it possible to connect to the IBM Blockchain Platform console on IBM Cloud.
   >
   > A tutorial which goes into detail on connecting to the IBM Blockchain Platform console within the extension will be published in a future release. 

* Ability to generate a 'private data' smart contract [#1826](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1826)
   > When creating a new smart contract project, you now have the ability to generate a 'private data' smart contract.
   >
   > This project includes a collections file which can be provided at instantiation time, as well as a smart contract which demonstrates how to read and write to a private data collection.
   >
   > A tutorial which goes into more detail on private data will be added at a later date!
   
Fixes
---
* Fixed adding a wallet using a gateway [#1894](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1894).

* Fixed problem loading wallets on activation [#1888](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1888).

* Fixed 'View on GitHub' links in sample gallery [#1776](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1776).

* Fixed gateway and wallet panels to refresh when an environment updates [#1877](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1877).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-67.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).