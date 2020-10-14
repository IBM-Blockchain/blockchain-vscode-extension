# IBM Blockchain Platform Extension updated to v1.0.38
_Release date: October 15th 2020_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Updated packaging to handle multiple GOPATH paths [#2596](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2596).
* Only display v1 capability channels in tree [#2596](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2624).
* Perform go mod vendor for Go low-level chaincode [#2689](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2689).
* Updated Node test runner to be optional [#2636](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2635).
* Updated required versions of Node [#2641](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2641).
* Updated OpenSSL requirements [#2633](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2633).
* Updated C++ build tools check for Windows [#2628](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2628).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-80.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).