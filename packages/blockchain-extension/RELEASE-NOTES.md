# IBM Blockchain Platform Extension updated to v2.0.0-beta.7
_Release date: August 27th 2020_

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
 
* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Ability to open the IBM Blockchain Platform Console from the environment [#2536](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2536).
* Automatically detect system requirements [#1398](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1398).
* Read identity name from JSON file [#755](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/755).
* Added command to remove extension directory [#1639](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1639).
* Updated default export connection profile name to be in pascal case [#2175](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2175).
* Removed required dependencies for old gRPC rebuild [#2560](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2560).
* Create Fabric 2.2 smart contracts [#2573](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2573).

Fixes
---
* Fixed IBM Cloud account selection bug [#2583](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2583).


Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
