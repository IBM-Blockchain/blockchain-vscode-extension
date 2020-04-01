# IBM Blockchain Platform Extension updated to v1.0.25
_Release date: April 2nd 2020_

Announcements
---

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >v1.4
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Added Status Page [#2029](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2029), [#1975](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1975)
  > We’ve now added a status page [https://ibm-blockchain.github.io/blockchain-vscode-extension](https://ibm-blockchain.github.io/blockchain-vscode-extension) which shows any known issues with the extension, as well as listing fixes and features for future releases!

* Subscribe to emitted smart contract events [#2029](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2029).
  > Call `Subscribe to Events` from the command palette, or right-click on a smart contract in the Fabric Gateways to subscribe to events emitted from your smart contract.

* Support adding IBM Blockchain Platform 2.1.3 environments [#2073](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2073), [#2078](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2078).

* Periodically refresh environment, gateway and wallet panels [#1879](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1879).

Fixes
---
* Stop showing teardown message on generator update when there are no local environments [#2069](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2069).

* Only show relevant right-click actions and command options on stopped/started local environments [#1500](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1500).

* Updated Node & npm prerequisite download location [#2101](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2101).


This release's Conga Comic:
---
<img src="https://congacomic.github.io/assets/img/blockheight-70.jpg" width="800">


For the full history of all releases, see the [change log](https://marketplace.visualstudio.com/items/IBMBlockchain.ibm-blockchain-platform/changelog).