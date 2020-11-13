# IBM Blockchain Platform Extension updated to v2.0.0-beta.10
_Release date: November 13th 2020_

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
 
* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Added support for connecting to IBM Blockchain Platform 2.5.1 [#2791](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2791).
* Updated local environment implementation [#2629](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2629)
 > Local environments now use [Microfab](https://github.com/IBM-Blockchain/microfab), making them much faster to start!
* Added a new transaction view, replacing the old submit/evaluate commands [#2639](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2639)
 > Left-click on a transaction or run the `Transact with Smart Contract` command to submit/evaluate transactions!

Fixes
---
* Reverted packaging metadata path change made in v1.0.39 [#2797](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2797).
 > We have reverted to look for the 'META-INF' directory again - sorry for the inconvenience!

Notes
---
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
