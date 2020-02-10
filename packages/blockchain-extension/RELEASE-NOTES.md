# IBM Blockchain Platform Extension updated to v1.0.19
_Release date: February 10th 2020_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

* Changing the `ibm-blockchain-platform.fabric.chaincode.timeout` setting will not work in this release due to moving to an Ansible based Local Fabric. This will be fixed in our next release.

Features & Enhancements
---
* Updated Local Fabric to use Ansible [#1768](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1768).

* Import Ansible created networks [#1848](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1848).

Fixes
---
* Fixed local development tutorial information on upgrading a smart contract [#1861](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1861).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-66.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).