# IBM Blockchain Platform Extension updated to v1.0.23
_Release date: March 10th 2020_

Announcements
---

* This version was released to fix a bug found in v1.0.21.

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >v1.4
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

* As part of our new feature for creating new 1-Organisation or 2-Organisation local Fabric environments locally, we have renamed the 'Local Fabric' environment to '1 Org Local Fabric'.

* If you have generated any functional tests for the old 'Local Fabric', you will need to change any paths to use the '1 Org Local Fabric' environment now.

Fixes
---
* Fixed environments failing to load when generator version updates [#2048](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2048).

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).