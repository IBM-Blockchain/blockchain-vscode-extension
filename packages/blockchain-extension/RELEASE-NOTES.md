# IBM Blockchain Platform Extension updated to v2.0.0-beta.3
_Release date: June 25th 2020_

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
* Fixed chaincode logs not appearing in logs [#2447](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pulls/2447).

* Fixed packaging contracts on VS Code 1.44.2 [#2243](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2243).

* Replaced Java 'org.json.JSONObject' non-deterministic package [#2287](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2287).

Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are still using Fabric 1.4.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment
