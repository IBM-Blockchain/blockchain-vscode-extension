<<<<<<< HEAD
# IBM Blockchain Platform Extension updated to v2.0.0-beta.3
_Release date: June 25th 2020_
=======
# IBM Blockchain Platform Extension updated to v1.0.34
_Release date: July 2nd 2020_
>>>>>>> 6bfa7efc... Changelog (#2488)

Announcements
---
* This is a duplicate of v2.0.0-beta.2 with a dependency fix.

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
  
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Deploy with endorsement policy [#1920](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1920).

* Can now target peers to use for commit, during deploy [#2229](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2229).

* Can now clone and open v2 code samples [#1256](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1256).

* Can now create, package and deploy Go contracts (using new contract API) [#2361](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2361), [#1653](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1653).

* Change deploy timeout value using `ibm-blockchain-platform.fabric.client.timeout` user setting [#2258](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2258).

Fixes
---
* Fix associating a wallet with multiple environments [#2354](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2354).

Notes
---
<<<<<<< HEAD
* Connecting to IBM Blockchain Platform environments will not work yet as they are still using Fabric 1.4.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
=======
<img src="https://congacomic.github.io/assets/img/blockheight-76.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).
>>>>>>> 6bfa7efc... Changelog (#2488)
