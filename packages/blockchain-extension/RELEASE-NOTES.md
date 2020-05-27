# IBM Blockchain Platform Extension updated to v2.0.0-beta.0
_Release date: May 27th 2020_

## 2.0.0-beta.0: May 27th 2020

Announcements
---
* This is the first release of a v2 version of the extension. We welcome all feedback on this version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
  
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features
---
* Added a new deploy view to support the new smart contract lifecycle in Fabric 2

Notes
---
* It is not yet possible to deploy with an endorsement policy or collection configuration.
* Connecting to IBM Blockchain Platform environments will not work yet as they are still using Fabric 1.4.
* Selecting which peers to endorse a commit with is not yet implemented, currently it will use all the peers that are listed in the environment you are deploying from.
* Go smart contracts may not deploy correctly
