# IBM Blockchain Platform Extension updated to v2.0.0-beta.9
_Release date: October 29th 2020_

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
 
* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Tutorials now open in webviews [#2645](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2645).

Fixes
---
* Updated tutorials and fixed broken images [#2731](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2731).
* Fixed packaging to look for 'contract-metadata' directory [#2772](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2772).

Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
