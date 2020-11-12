# IBM Blockchain Platform Extension updated to v1.0.40
_Release date: November 12th 2020_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Added support for connecting to IBM Blockchain Platform 2.5.1 [#2791](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2791).

Fixes
---
* Reverted packaging metadata path change made in v1.0.39 [#2797](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2797).
 > We have reverted to look for the 'META-INF' directory again - sorry for the inconvenience!


For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).