# IBM Blockchain Platform Extension updated to v1.0.16
_Release date: November 28th 2019_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

* We’re currently exploring creating a status page. Creating this will allow us to make any future problems and workarounds visible, until they are able to be addressed in a release. 

Features & Enhancements
---
* Local Fabric functionality is now optional [#1497](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1497)
   > If you do not want to use the Local Fabric functionality, you are now able to turn it on/off from the Prerequisites page (by calling `View Prerequisites` from the command palette) or User Settings.
   >
   > Disabling this functionality means that Docker and Docker Compose dependencies are not required. On Windows, the OpenSSL and the windows-build-tools are not required as well.
* Updated Java functional test dependency and README [#1663](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1663)
   > If you have previously generated Java functional tests during its BETA, please update the `fabric-gateway-java` dependency from `1.4.1-SNAPSHOT` to `1.4.2`.
   >
   > For more information on Java functional tests, please check the [README](https://github.com/IBM-Blockchain/blockchain-vscode-extension#java-functional-tests).
* Release notes will now pop-up when the extension updates [#1689](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1689)
   > In a future release, we plan on making it possible to open the release notes from inside of VS Code at any time. 
* Added performance reports link to the Home page [#1632](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1632)

Fixes
---
* Fixed dialog when there are no packages to delete [#1567](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1567)


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-63.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).