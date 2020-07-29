# IBM Blockchain Platform Extension updated to v2.0.0-beta.6
_Release date: July 30th 2020_

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
 
* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Updated welcome page to mention the extension uses Fabric 2 [#1779](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1779)
* Explain how v2 deployment works in step one of the deploy view [#2429](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2429)
* Recover from failed deploy [#2512](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2512)
* Allow user to bring output into focus on network start failure [#2172](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2172).
* Docker logs shown on transaction failure [#1964](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1964).
* Updated IBM Cloud group name and behaviour [#2521](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2521).

Fixes
---
* Fixed organsation approval table error appearing on initial load [#2545](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2545).
* Fallback on GitHub retrieval failure [#2543](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2543).


Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
