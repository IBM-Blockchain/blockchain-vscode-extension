# IBM Blockchain Platform Extension updated to v1.0.17
_Release date: December 12th 2019_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

Features & Enhancements
---
* Instantiate/Upgrade with a smart contract endorsement policy [#1603](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1603).
   > When instantiating/upgrading a smart contract, you are now able to use the 'Default' smart contract endorsement policy (1 endorsement from any organisation), or to choose a 'Custom' endorsement policy.
   >
   > Selecting Custom will allow you to provide a JSON file containing the custom smart contract endorsement policy.
   >
   > For more information about writing endorsement policies in JSON, see [Hyperledger Fabric Node SDK documentation](https://fabric-sdk-node.github.io/global.html#ChaincodeInstantiateUpgradeRequest).

* Updated README to add compatibility notes, restructure prerequisites section and included current Local Fabric version [#1708](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1708), [#1709](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1709), [#1710](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1710).

* Added setting for showing the Home page on next activation [#1578](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1578).
   > By setting `"ibm-blockchain-platform.home.showOnNextActivation": true`, the Home page will open when VS Code is reloaded and the extension is activated.  


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-64.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).