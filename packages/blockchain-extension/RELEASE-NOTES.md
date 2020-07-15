# IBM Blockchain Platform Extension updated to v2.0.0-beta.5
_Release date: July 16th 2020_

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
 
* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Updated tutorials for Fabric 2 [#1252](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1252).
* Only allow users to package Fabric 2 smart contract [#1783](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1783).
* Removed gRPC dependency [#2470](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2470).
   > As gRPC is no longer used, the extension does not have to rebuild the dependency any more.
* Allow users to only connect to Fabric 2 environments and gateways [#1782](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1782).
* Added "+ Log in to IBM Cloud" tree item to environment panel [#2430](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2430).
* Generate Go functional tests [#2362](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2362).
   > See [here](https://github.com/IBM-Blockchain/blockchain-vscode-extension/tree/v2#go-functional-tests---beta) for more information

Fixes
---
* Updated packaging to use unique labels [#2511](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2511).


Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
