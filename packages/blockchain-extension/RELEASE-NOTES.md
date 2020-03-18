# IBM Blockchain Platform Extension updated to v1.0.24
_Release date: March 19th 2020_

Announcements
---

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >v1.4
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* View files included in package [#1960](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1960).
   > Right-click on your package in the `Smart Contracts` panel and select `View Package Information` to see the files included in your package. The files will be logged out in the Output.

* Updated Home page design [#1982](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1982).

* Add an IBM Blockchain Platform network using a username & password (in addition to API Key and Secret) [#1979](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1979).

* Updated to use Fabric SDK 1.4.8 packages - this also fixes rebuild on VS Code 1.43.0 [#2059](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2059)

* Allow debugging of 2-organisation local environments [#1995](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1995)
   > When you start the debugger it will ask you to select an organisation (and gateway) to debug for. To select another organisation, you must stop the debugger and start it again.

* Added "Create and use custom Fabric network" tutorial [#1749](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1749)
   > This tutorial is accessible from the Tutorial Gallery and explains how to write and run Ansible playbooks, as well as import the network into the extension.

Fixes
---
* Remove trailing path from URL when adding an IBM Blockchain Platform network [#1980](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1980).

* Force teardown local environments when generator has major version change [#1880](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1880).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-69.jpg" width="800">


For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).