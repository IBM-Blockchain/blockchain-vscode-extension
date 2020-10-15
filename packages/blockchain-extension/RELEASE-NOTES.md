# IBM Blockchain Platform Extension updated to v2.0.0-beta.8
_Release date: October 15th 2020_

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
 
* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Added NPS survey link on first transaction submission [#2210](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2210).
* Updated Node test runner to be optional [#2636](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2635).
* Updated packaging to handle multiple GOPATH paths [#2596](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2596).
* Updated required versions of Node [#2641](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2641).

Fixes
---
* Fixed channel capability retrieval [#2669](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2669).
* Improved prerequisites page load time [#1437](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1437).
* Allow users to connect to environments & gateways with at least one v2 capability enabled channel [#2540](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2540).


Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
