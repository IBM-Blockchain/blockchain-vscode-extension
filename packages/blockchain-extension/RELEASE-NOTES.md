# IBM Blockchain Platform Extension updated to v1.0.21
_Release date: March 5th 2020_

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

* As part of our new feature for creating new 1-Organisation or 2-Organisation local Fabric environments locally, we have renamed the 'Local Fabric' environment to '1 Org Local Fabric'.

* If you have generated any functional tests for the old 'Local Fabric', you will need to change any paths to use the '1 Org Local Fabric' environment now.

Features & Enhancements
---
* Ability to create new 1-Organisation or 2-Organisation local Fabric environments locally [#1898](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1898), [#1862](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1862), [#1863](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1863), [#1558](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1558).
   > It's now possible to create a new local runtime from either a 1-Organisation or 2-Organisation template, when adding a new environment.
   >
   > A 2-Organisation local environment can be used to try out generated private data smart contracts.

* Added a new `Getting Started with Private Data` tutorial [#1988](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1988).
   > This tutorial goes through a private data scenario, creating the 2 Organisation network and generating a starting private data smart contract using the extension.
   >
   > This tutorial can be accessed from the Tutorial Gallery by running the '`View Tutorial Gallery`' command. 

* Ability to open up the latest release notes [#1898](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1898).
   > From the Command Palette it's now possible to open up the latest release notes by running the '`Open Release Notes`' command.

* Ability to open up Home page from the status bar [#1983](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1983).
   > On the bottom status bar, you can now click '`Blockchain home`' to open up the home page.

* Newly generated smart contracts will use version 1.4.5 of the `fabric-contract-api` and `fabric-shim`. Any local environments created will also use 1.4.6 of the Fabric Docker images.
   > This also fixes the packaging issue [#2014](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2014)

Fixes
---
* Should show error if there are no packages to install [#1701](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1701).

* Should show error if there are no smart contracts to instantiate [#1702](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1702).

* Disabling local functionality shouldn't make Docker for Windows or the System Requirements required [#1843](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1843).

* Fixed adding a wallet with the same name deleting the original wallet [#1838](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1838).

* Fixed being able to replace an identity [#1846](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1846).

* Fixed asking the user to select the channel when submitting/evaluating a transaction, when the contract is instantied on multiple channels [#1777](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1777).

* Fixed error when attempting to upgrade from command palette when there are no smart contracts [#1970](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1970).

* Fixed error when attempting to delete a gateway which was created from an environment [#1966](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1966).

* Removed broken `Open New Terminal` command [#1858](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1858).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-68.jpg" width="800">

For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).