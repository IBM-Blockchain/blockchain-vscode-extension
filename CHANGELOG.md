# IBM Blockchain Platform Extension Change Log

## 2.0.0-rc.1: December 17th 2020

Announcements
---

* **VS Code v1.40 or greater is now the minimum version required for using the v2.0.0 version of the extension.**

Features & Enhancements
---
* Support for Fabric v2.0 lifecycle.
 > This extension now support all operations required to deploy smart contracts to a Fabric V2 channel.
 >
 > When creating a new local environment, you now have the option to specify the capabilities of the channel to be created.
 >
 > To use the new Fabric v2.0 lifecycle you need to create a local environment which has V2 capabilities.
 >
 > Be sure to check out the updated 'Basic tutorials' to find out how to use the new lifecycle.
* New 'Deploy Smart Contract' command
 > We've included a new 'Deploy Smart Contract' command which is callable from the command palette.
 >
 > This command allows you to easily install and instantiate a smart contract (if using a V1 channel), or install, approve and commit a smart contract (if using a V2 channel) - using a single action.
* New 'Transact with Smart Contract' command
 > We've included a new 'Transact with Smart Contract' command which makes it easier to submit/evaluate transactions.

Fixes
---
* No longer need to rebuild gRPC [#1621](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621)

Be sure to take a look at our previous 2.0.0-beta.x releases in the changelog to see the full list of changes made.

Notes
---
* Smart contract debugging is unavailable [#2660](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2660)

![conga comic](https://congacomic.github.io/assets/img/blockheight-82.jpg)


## 2.0.0-beta.10: November 13th 2020

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.

* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
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


## 1.0.40: November 12th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Added support for connecting to IBM Blockchain Platform 2.5.1 [#2791](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2791).

Fixes
---
* Reverted packaging metadata path change made in v1.0.39 [#2797](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2797).
 > We have reverted to look for the 'META-INF' directory again - sorry for the inconvenience!



## 2.0.0-beta.9: October 29th 2020

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.

* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Tutorials now open in webviews [#2645](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2645).

Fixes
---
* Updated tutorials and fixed broken images [#2731](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2731).
* Fixed packaging to look for 'contract-metadata' directory [#2772](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2772).


Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment


## 1.0.39: October 29th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* New "Joining a network" tutorials [#2677](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2677).
 > The purpose of this set of tutorials is to take you through the process of joining an existing Hyperledger Fabric network using the tools provided by IBM Blockchain Platform. 

Fixes
---
* Fixed packaging to look for 'contract-metadata' directory [#2755](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2755).
* Made the IBM Cloud Account extension optional [#2713](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2713).

![conga comic](https://congacomic.github.io/assets/img/blockheight-81.jpg)

## 2.0.0-beta.8: October 15th 2020

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.

* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

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
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment

## 1.0.38: October 15th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Updated packaging to handle multiple GOPATH paths [#2596](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2596).
* Only display v1 capability channels in tree [#2596](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2624).
* Perform go mod vendor for Go low-level chaincode [#2689](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2689).
* Updated Node test runner to be optional [#2636](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2635).
* Updated required versions of Node [#2641](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2641).
* Updated OpenSSL requirements [#2633](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2633).
* Updated C++ build tools check for Windows [#2628](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2628).

![conga comic](https://congacomic.github.io/assets/img/blockheight-80.jpg)

## 2.0.0-beta.7: August 27th 2020

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

## 1.0.37: August 27th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Ability to open the IBM Blockchain Platform Console from the environment [#2536](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2536).
* Automatically detect system requirements [#1398](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1398).
* Read identity name from JSON file [#755](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/755).
* Added command to remove extension directory [#1639](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1639).
* Updated default export connection profile name to be in pascal case [#2175](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2175).

Fixes
---
* Fixed IBM Cloud account selection bug [#2583](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2583).

![conga comic](https://congacomic.github.io/assets/img/blockheight-79.jpg)

## 2.0.0-beta.6: July 30th 2020

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

## 1.0.36: July 30th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
*  Allow user to bring output into focus on network start failure [#2172](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2172).
*  Docker logs shown on transaction failure [#1964](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1964).
*  Updated IBM Cloud group name and behaviour [#2521](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2521).

Fixes
---
* Fallback on GitHub retrieval failure [#2543](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2543).

![conga comic](https://congacomic.github.io/assets/img/blockheight-78.jpg)

## 2.0.0-beta.5: July 16th 2020

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.

* **VS Code v1.40 or greater is now the minimum version required for using the 'v2' version of the extension.**

Features & Enhancements
---
* Updated tutorials for Fabric 2 [#1252](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1252).
* Only allow users to package Fabric 2 smart contract [#1783](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1783).
* Removed gRPC dependency [#2470](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2470).
   > As gRPC is no longer used, the extension does not have to rebuild the dependency any more.
* Allow users to only connect to Fabric 2 environments and gateways [#1782](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1782).
* Generate Go functional tests [#2362](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2362).
   > See [here](https://github.com/IBM-Blockchain/blockchain-vscode-extension/tree/v2#go-functional-tests---beta) for more information

Fixes
---
* Updated packaging to use unique labels [#2511](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2511).


Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment

## 1.0.35: July 16th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
*  Added "+ Log in to IBM Cloud" tree item to environment panel. [#2430](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2430).


![conga comic](https://congacomic.github.io/assets/img/blockheight-77.jpg)

## 2.0.0-beta.4: July 2nd 2020

Announcements
---

* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 
 
Features & Enhancements
---
* View organisations that have approved definition [#2436](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2436).

Fixes
---
* Fix associating a wallet with multiple environments [#2354](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2354).


Notes
---
* Connecting to IBM Blockchain Platform environments will not work yet as they are not using the new lifecycle yet.
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.
* Debug doesn't work at moment


## 1.0.34: July 2nd 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Fixes
---
* Fix associating a wallet with multiple environments [#2354](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2354).


![conga comic](https://congacomic.github.io/assets/img/blockheight-76.jpg)

## 2.0.0-beta.3: June 25th 2020

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


## 2.0.0-beta.2: June 18th 2020

Announcements
---
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

## 1.0.33: June 18th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Fixes
---
* Fixed chaincode logs not appearing in logs [#2447](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pulls/2447).

* Fixed packaging contracts on VS Code 1.44.2 [#2243](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2243).

* Replaced Java 'org.json.JSONObject' non-deterministic package [#2287](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2287).


![conga comic](https://congacomic.github.io/assets/img/blockheight-75.jpg)

## 2.0.0-beta.1: June 4th 2020

Announcements
---
* We welcome all feedback on this beta version so far. Please see the notes section for known issues.

* To install the extension, download the vsix file named `ibm-blockchain-platform-<VERSION>.vsix` from the [GitHub releases](https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases) page.
  In VS Code, switch to the Extensions view, click the hamburger menu and and select 'Install from VSIX'. Finally, select the downloaded vsix file. The extension should then install successfully.
  
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features
---
* Package an open workspace from the deploy view [#1918](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1918).

* Deploy with a private data collection [#1921](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1921).

Notes
---
* It is not yet possible to deploy with an endorsement policy.
* Connecting to IBM Blockchain Platform environments will not work yet as they are still using Fabric 1.4.
* Selecting which peers to endorse a commit with is not yet implemented, currently it will use all the peers that are listed in the environment you are deploying from.
* Go smart contracts may not deploy correctly
* If you already have v1.4 local environment's running, you'll need to tear them down and start them again to use them as v2 local environments.

## 1.0.32: June 4th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Updated environment grouping and icons [#2023](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2023).

* Export application data (experimental feature) [#2220](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2220).

Fixes
---
* Fixed tutorial panels on smaller screen sizes [#2273](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2273).


![conga comic](https://congacomic.github.io/assets/img/blockheight-74.jpg)

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

## 1.0.31: May 26th 2020

Announcements
---
* This version of the extension is a republish of our v1.0.30 release which didn't publish to the marketplace correctly.

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 
Features & Enhancements
---
* Updated gateway & wallet grouping - part of [#2023](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2023).


Fixes
---
* Updated OpenSSL ‘info’ on PreReq view with required install locations [#2298](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2298).

* Only show right-click ‘Start’ option on local environments [#2285](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2285).

* Updated ‘Open Tutorial’ buttons [#2275](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2275).

* Fixed webview on Windows [#2233](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2233).

![conga comic](https://congacomic.github.io/assets/img/blockheight-73.jpg)

## 1.0.30: May 22nd 2020

Announcements
---
* This version of the extension is a republish of our v1.0.29 release which didn't publish to the marketplace correctly.

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 
Features & Enhancements

---
* Updated gateway & wallet grouping - part of [#2023](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2023).


Fixes
---
* Updated OpenSSL ‘info’ on PreReq view with required install locations [#2298](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2298).

* Only show right-click ‘Start’ option on local environments [#2285](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2285).

* Updated ‘Open Tutorial’ buttons [#2275](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2275).

* Fixed webview on Windows [#2233](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2233).

![conga comic](https://congacomic.github.io/assets/img/blockheight-73.jpg)

## 1.0.29: May 21st 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Updated gateway & wallet grouping - part of [#2023](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2023).


Fixes
---
* Updated OpenSSL ‘info’ on PreReq view with required install locations [#2298](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2298).

* Only show right-click ‘Start’ option on local environments [#2285](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2285).

* Updated ‘Open Tutorial’ buttons [#2275](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2275).


![conga comic](https://congacomic.github.io/assets/img/blockheight-73.jpg)

## 1.0.28: May 7th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >1.40.x.
 > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Add an environment by connecting to IBM Blockchain Platform Console for IBM Cloud [#1333](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1333).
 > When adding an environment, selecting ‘Add an IBM Blockchain Platform network’ will now let you discover nodes from your IBM Blockchain Platform Console for IBM Cloud instance.

* New developer tutorials and updated tutorial view [#1197](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1197).
 > There are 10 new tutorials (written by the team who run IBM’s developer labs and create official blockchain certifications) that will take you through core concepts, preparing you to take the IBM Blockchain Essentials and IBM Blockchain Foundation Developer courses and hopefully earn the badges!
 > 
 > These tutorials cover topics such as:
 > -	Introduction to Blockchain
 > -	Creating a smart contract
 > -	Deploying a smart contract
 > -	Invoking a smart contract from VS Code
 > -	Invoking a smart contract from an external application
 > -	Upgrading a smart contract
 > -	Debugging a smart contract
 > -	Testing a smart contract
 > -	Publishing an event 
 > -	Recap and additional resources

Fixes
---
* Fixed ‘Webview is disposed’ when attempting to open a closed webview in VS Code 1.44.x [#2234](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2234).

* Updated code-server support and instructions [#2236](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2236).


![conga comic](https://congacomic.github.io/assets/img/blockheight-72.jpg)

## 1.0.27: April 23rd 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
  > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
---
* Group gateways and wallets into folders based on the environment they're related to [#1865](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1865).

Fixes
---
* Fixed JDK popup appearing on Mac when checking prerequisites [#1657](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1657).

* Fixed "Cannot read property 'major' of null" error on activation [#2200](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2200).

* Fixed TypeScript contract packaging failing on VS Code 1.44.x [#2193](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2193).


![conga comic](https://congacomic.github.io/assets/img/blockheight-71.jpg)


## 1.0.26: April 7th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
  > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Fixes
---
* Fixed exported wallets containing unexpected additional content [#2065](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2065).

* Reverted "Periodically refresh environment, gateway and wallet panels" [#2159](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/2159).


## 1.0.25: April 2nd 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
  > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

Features & Enhancements
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

![conga comic](https://congacomic.github.io/assets/img/blockheight-70.jpg)

## 1.0.24: March 19th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
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

![conga comic](https://congacomic.github.io/assets/img/blockheight-69.jpg)

## 1.0.23: March 10th 2020

Announcements
---
* This version was released to fix a bug found in v1.0.21.

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >v1.4
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

* As part of our new feature for creating new 1-Organisation or 2-Organisation local Fabric environments locally, we have renamed the 'Local Fabric' environment to '1 Org Local Fabric'.

* If you have generated any functional tests for the old 'Local Fabric', you will need to change any paths to use the '1 Org Local Fabric' environment now.

Fixes
---
* Fixed environments failing to load when generator version updates [#2048](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2048).

## 1.0.22: March 10th 2020

Announcements
---
* This version was released to fix a bug found in v1.0.21.

* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code >v1.4
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround. 

* As part of our new feature for creating new 1-Organisation or 2-Organisation local Fabric environments locally, we have renamed the 'Local Fabric' environment to '1 Org Local Fabric'.

* If you have generated any functional tests for the old 'Local Fabric', you will need to change any paths to use the '1 Org Local Fabric' environment now.

Fixes
---
* Fixed `"Failed to activate extension: TypeError: 'isExtensible' on proxy: trap result does not reflect extensibility of proxy target (which is 'true')."` error [#2040](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/2040).

## 1.0.21: March 9th 2020

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
   > On the bottom status bar, you can now click '`Blockchain Home`' to open up the home page.

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

* Fixed error when attempting to delete an environment which has a gateway created from it [#1966](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1966).

* Removed broken `Open New Terminal` command [#1858](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1858).

![conga comic](https://congacomic.github.io/assets/img/blockheight-68.jpg)

## 1.0.20: February 20th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

Features & Enhancements
---
* Ability to use transaction data files to make submitting transactions easier [#1822](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1822) [#1823](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1823) [#1801](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1801).
   > It’s now possible to create transaction data files, removing the need to manually type in arguments every time you submit a transaction.
   >
   > For information on how to write and use transaction data files, check out the [README](https://github.com/IBM-Blockchain/blockchain-vscode-extension#using-transaction-data-files-to-submit-a-transaction).

* Ability to add an environment by connecting to a IBM Blockchain Platform console software instance [#1334](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1334) [#1335](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1335).
   > In addition to this we are currently working on making it possible to connect to the IBM Blockchain Platform console on IBM Cloud.
   >
   > A tutorial which goes into detail on connecting to the IBM Blockchain Platform console within the extension will be published in a future release. 

* Ability to generate a 'private data' smart contract [#1826](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1826)
   > When creating a new smart contract project, you now have the ability to generate a 'private data' smart contract.
   >
   > This project includes a collections file which can be provided at instantiation time, as well as a smart contract which demonstrates how to read and write to a private data collection.
   >
   > A tutorial which goes into more detail on private data will be added at a later date!

Fixes
---
* Fixed adding a wallet using a gateway [#1894](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1894).

* Fixed problem loading wallets on activation [#1888](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1888).

* Fixed 'View on GitHub' links in sample gallery [#1776](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1776).

* Fixed gateway and wallet panels to refresh when an environment updates [#1877](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1877).

![conga comic](https://congacomic.github.io/assets/img/blockheight-67.jpg)

## 1.0.19 February 10th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

* Changing the `ibm-blockchain-platform.fabric.chaincode.timeout` setting will not work in this release due to moving to an Ansible based Local Fabric. This will be fixed in our next release.

Features & Enhancements
---
* Updated Local Fabric to use Ansible [#1768](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1768).

* Import Ansible created networks [#1848](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1848).

Fixes
---
* Fixed local development tutorial information on upgrading a smart contract [#1861](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1861).

![conga comic](https://congacomic.github.io/assets/img/blockheight-66.jpg)

## 1.0.18: January 16th 2020

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

Features & Enhancements
---
* Updated Local Smart Contract Development tutorial [#1806](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1806).

Fixes
---
* Updated deleting nodes prompt message [#1752](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1752)

* Fixed error instantiating when running a non-smart contract debugging session [#1614](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1614)

* Updated generated debug configuration [#1079](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1079)

* Fixed environment refreshing view when importing nodes bug [#1762](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1762)

* Fixed bug when creating an environment from a gateway which showed peers in the CA list [#1733](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1733)

* Updated OpenSSL prerequisites installation check [#1654](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1654).

* Strip leading/trailing whitespace for transaction arguments [#1752](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1752)

![conga comic](https://congacomic.github.io/assets/img/blockheight-65.jpg)

## 1.0.17: December 12th 2019

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

Features & Enhancements
---
* Instantiate/Upgrade with a smart contract endorsement policy [#1603](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1603)
   > When instantiating/upgrading a smart contract, you are now able to use the 'Default' smart contract endorsement policy (1 endorsement from any organisation), or to choose a 'Custom' endorsement policy.
   >
   > Selecting Custom will allow you to provide a JSON file containing the custom smart contract endorsement policy.
   >
   > For more information about writing endorsement policies in JSON, see [Hyperledger Fabric Node SDK documentation](https://fabric-sdk-node.github.io/global.html#ChaincodeInstantiateUpgradeRequest).


* Updated README to add compatibility notes, restructure prerequisites section and included current Local Fabric version [#1708](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1708), [#1709](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1709), [#1710](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1710).

* Added setting for showing the Home page on next activation [#1578](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1578).
> By setting `”ibm-blockchain-platform.home.showOnNextActivation”: true`, the Home page will open when VS Code is reloaded and the extension is activated.  


![conga comic](https://congacomic.github.io/assets/img/blockheight-64.jpg)

## 1.0.16: November 28th 2019

Announcements
---
* We’re still waiting for the gRPC v1.25.0 binaries to be published so you may be affected by [this issue](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621), where gRPC fails to rebuild when using VS Code 1.40.x.
   > Please see [this comment](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1621#issuecomment-552926559) for a workaround.

* We’re currently exploring creating a status page. Creating this will allow us to make any future problems and workarounds visible, until they are able to be addressed in a release. 

Features & Enhancements
---
* Local Fabric functionality is now optional [#1497](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1497)
   > If you do not want to use the Local Fabric functionality, you are now able to turn it on/off from the Prerequisites page (by calling `View Prerequisites` from the command palette) or User Settings.
   >
   > Disabling this functionality means that Docker and Docker Compose dependencies are not required. On Windows, the OpenSSL and the windows-build-tools are not required as well.
* Updated Java functional test dependency and README [#1663](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1663)
   > If you have previously generated Java functional tests during its BETA, please update the `fabric-gateway-java` dependency from `1.4.1-SNAPSHOT` to `1.4.2`.
   >
   > For more information on Java functional tests, please check the [README](https://github.com/IBM-Blockchain/blockchain-vscode-extension#java-functional-tests).
* Release notes will now pop-up when the extension updates [#1689](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1689)
   > In a future release, we plan on making it possible to open the release notes from inside of VS Code at any time. 
* Added performance reports link to the Home page [#1632](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1632)

Fixes
---
* Fixed dialog when there are no packages to delete [#1567](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1567)


![conga comic](https://congacomic.github.io/assets/img/blockheight-63.jpg)

## 1.0.15: November 7th 2019

Features & Enhancements
---
* Generate Java functional tests [#1513](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1513) :tada:
> This is a BETA release of this feature as it requires a snapshot of a dependency. As a result, these generated tests shouldn’t be used in production as you may encounter problems - [please check here for more information](https://github.com/IBM-Blockchain/blockchain-vscode-extension#beta-java-functional-tests)
* Added tutorials to the Tutorial Gallery for creating identities and creating identities with attributes [#1172](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1172) [#1170](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1170)
* Ability to associate multiple nodes with an identity [#1416](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1416)


Fixes
---
* Fixed "No path for wallet has been provided" bug [#1593](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1593)


![conga comic](https://congacomic.github.io/assets/img/blockheight-62.jpg)


## 1.0.14: October 24th 2019

Fixes
---
* Fixed publishing & telemetry reporting [#1588](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1588)


## 1.0.13: October 24th 2019

Features & Enhancements
---
* Delete multiple environments from command palette [#1376](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1376)
* Display channel peers when hovering over channel tree item [#1492](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1492)
* Target custom peers when submitting/evaluating a transaction [#1514](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1514)
* Updated to use file system registries [#1517](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1517)
* Display empty panel tree items [#1564](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1564)

Fixes
---
* Fixed generated gateway ssl override property [#1525](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1525)
* Fixed Local Fabric Wallet display name [#1509](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1509)
* Fixed environment disconnect icon on other panels [#1549](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1549)
* Updated ‘Add Environment’ tutorial [#1550](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1550)
* Fixed to show stack trace when extension fails to activate [#1553](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1553)
* Removed wallet property from exported connection profile [#1459](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1459)
* Fixed adding an identity to Local Fabric Wallet if not connected [#1465](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1465)


![conga comic](https://congacomic.github.io/assets/img/blockheight-61.png)

## 1.0.12: October 10th 2019

* Fixed submitting transactions where there are multiple channels [#1443](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1443)
* Export connection profile when connected to gateway [#1386](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1386)
* Cancelling importing nodes during environment creation no longer errrors [#1446](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1446)
* Fixed ‘cannot launch program’ when starting debug on Windows  [#1077](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1077)
* Fixed debug toolbar icon appearing when it shouldn’t [#1464](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1464)
* Added the ability to delete multiple identities at once using the Command Palette [#1447](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1447)

![conga comic](https://congacomic.github.io/assets/img/blockheight-60.png)

## 1.0.11: September 26th 2019

* Fixed refreshing environments [#1188](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1188)
* User input boxes don’t close after focus has changed [#1372](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1372)
* Fixed sample application selection [#1368](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1368)
* Made logging messages more consistent [#1391](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1391)
* Fixed cancelling during adding environment behaviour [#1390](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1390)
* Prevent native dependencies being rebuilt if they can be required [#1389](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1389)
* Show path of contracts in workspace when packaging [#1399](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1399)
* Updated README to explain associating an identity and wallet when adding environment nodes [#1350](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1350)
* Added a suggested gateway name when creating from an environment [#1383](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1383)
* Fixed OpenSSL prerequisite check [#1406](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1406)
* Updated Local Fabric runtime to use Fabric 1.4.3 Docker images [#1356](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1356)
* Fixed runtime folder destination migration check [#1384](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1384)
* Added deleting nodes from an environment [#1332](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1332)

![conga comic](https://congacomic.github.io/assets/img/blockheight-59.jpg)

## 1.0.10: September 12th 2019

* Prerequisites page [#967](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/967)
> When using the extension for the first time, the Prerequisites page will display a list of the required and optional dependencies. This page is also shown any time the extension cannot detect the required dependencies.
>This page makes it easier to download dependencies, as well as find out which dependencies the extension can detect.
> If for some reason the extension cannot detect a dependency after installing and clicking `Check again` on the page, please [raise an issue here](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues), and click the `Skip prerequisite check` at the bottom of the page. This will bypass the dependency checking functionality.  

* Render sample page without an internet connection [#1212](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1212)
* Import nodes to an existing environment [#1331](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1331)
* Added information about nodes to tooltips [#1093](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1093)
* Change identity associated with node [#1092](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1092)
* Remove multiple wallets from command palette [#1065](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1065)
* Remove multiple gateways from command palette [#1066](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1066)


![conga comic](https://congacomic.github.io/assets/img/blockheight-58.png)

## 1.0.9: September 5th 2019

* Fixed creating a gateway from an environment when no MSPID has been set [#1369](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1369)
* Added selecting a workspace when generating functional tests and error when attempting to generate tests for a Java contract [#1359](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1359)
> This is part of the work required for our future feature of generating Java functional tests - [#520](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/520)  

* Fixed connecting to an environment using an existing wallet [#1367](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1367)
* Fixed debug tutorial typo [#1343](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1343)
* Fixed environment tutorial typo [#1322](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1322)
* Updated README to state VS Code Remote Development doesn't work - but we're working on the issue [#1357](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1357)
* Updated adding an identity with a JSON identity file method label [#1116](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1116)
* Added associating an identity with multiple nodes [#1089](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1089)
* Fixed debug when doing a reload [#1230](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1230)
* Moved exporting a connection profile to a gateway [#1040](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1040)
* Fixed using the caName when adding an identity [#1345](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1345) - a massive thank you to @mazyblue for this external contribution! :tada: :tada: :tada:


## 1.0.8: August 29th 2019

* Create a gateway from a Fabric Environment [#1108](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1108)
> When creating a gateway, you now have the option to create a gateway from a Fabric Environment.
 
* Added validation for asset type when generating a smart contract [#1270](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1270)
* Display orderers in service clusters [#1229](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1229)
* Support for scoped contract names [#1138](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1138)
* Updated README [#1319](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1319)
* Updated tutorial times [#1291](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1291)

![conga comic](https://congacomic.github.io/assets/img/blockheight-57.png)

## 1.0.7: August 15th 2019

* Added ‘Fabric Environments’ panel to support remote deploying and managing user-created networks [#1085](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1085),  [#1086](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1086),  [#1095](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1095),  [#1088](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1088),  [#1177](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1177),  [#1103](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1103),  [#1156](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1156),  [#1222](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1222),  [#1290](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1290) 
> Check out the new tutorial ‘Adding an Environment to connect to IBM Cloud’ from the extension’s Tutorial Gallery.
> For additional information on connecting to other instances of Hyperledger Fabric, [check the README.](https://github.com/IBM-Blockchain/blockchain-vscode-extension#connecting-to-another-instance-of-hyperledger-fabric)
> To view the list of uncompleted features related to this epic, [click here!](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1084)
 
* Discover version of Electron to automatically rebuild gRPC [#1134](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1134)
* Added ‘Adding an Environment to connect to IBM Cloud’ and ‘Debug a Smart Contract’ tutorials to Tutorial Gallery [#1232](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1232)
* Updated tutorial completion time [#1203](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1203)
* Fixed debugging container bug [#1215](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1215)
* Fixed disappearing blockchain icon when restarting debug [#929](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/929)
* Fixed querying channels from no peers [#1098](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1098)
* Bumped Fabric SDK version to use 1.4.5 snapshot [#1278](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1278)
> This now means that you can use `.fabricignore` to ignore files/directories when packaging. [Check the README for more details](https://github.com/IBM-Blockchain/blockchain-vscode-extension#package-open-project)

![conga comic](https://congacomic.github.io/assets/img/blockheight-56.jpg)

## 1.0.6: August 1st 2019

* Added Java smart contract support [#520](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/520) 
> It is now possible to generate Java smart contracts!
> There are also Java versions of the FabCar and Commercial Paper sample contracts and application available to try out.
> For more information check out the README or updated local development tutorial!

* Removed ability to toggle the Local Fabric to development mode [#877](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/877)
> The Local Fabric will now always remain in development mode.
> Also, it is now possible to configure the transaction timeout values in the user settings, making it easier to debug your smart contracts.
> For more information on changing the transaction timeout values, check out the README.

* Updated Fabric dependency to 1.4.2 [#1167](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1167)
* Generated functional tests split by function [#1082](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1082)
* Select CA for enrolling users with via wallet [#1160](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1160)
* Updated dependencies for generated functional tests [#1157](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1157)
* Fixed connecting to gateway without admin access to peer bug [#1142](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1142)
* Updated menu labels and command names [#1179](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1179)
* Improved transaction error reporting [#1110](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1110)
* Updated 'local_fabric' and 'local_fabric_wallet' display names [#1105](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1105)

![conga comic](https://congacomic.github.io/assets/img/blockheight-55.jpg)

## 1.0.5: July 17th 2019

* gRPC fix [#1124](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1124)
* Removed scope from package name [#1117](https://github.com/IBM-Blockchain/blockchain-vscode-extension/pull/1117)
* Add attributes to an identity created with local fabric CA [#1113](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1113)
* Changed home page GitHub issues link [#1067](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1067)
* Fixed debug bug and improved behaviour [#1118](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/1118)

## 1.0.4: July 4th 2019

* Updated Go and Java debugging instructions [#1028](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1028)
* Updated invalid certificate error handling [#1015](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1015)
* Add identities to wallet by providing JSON file from IBM Blockchain Platform console  [#926](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/926)
* Updated Fabric dependencies  [#1081](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1081)
* Removed providing a MSPID for Local Fabric Wallet  [#965](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/965)
* Updated to store wallets and gateways in different directories  [#1016](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1016)
* Updated to use latest version of VS Code  [#1120](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1120)


![conga comic](https://congacomic.github.io/assets/img/blockheight-54.png)

## 1.0.3: June 19th 2019

* Tidied wallet user settings [#970](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/970)
* Improved tests [#695](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/695)
* Updated Telemetry [#1019](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1019)
* Check generator version compatibility [#1013](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1013)
* Updated debug logic [#956](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/956)
* Tutorial fixes and README image update [#1048](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1048)

![conga comic](https://congacomic.github.io/assets/img/blockheight-53.png)

## 1.0.2: June 6th 2019

* Split out generated test boilerplate code [#827](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/827)
* Prevent adding duplicate wallets [#989](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/989)
* Support array types in generated tests [#1002](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1002)
* Updated deprecated test runner [#1026](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1026)
* Fixed bug requiring local_fabric to be running before being able to connect to gateway [#1025](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1025)
* Updated transaction timeout in debug mode to be infinite [#953](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/953)
* Added check for invalid smart contract project names [#968](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/968)
* Prevent adding duplicate gateways [#990](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/990)
* Fixed overwriting for export connection profile command [#1001](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/1001)
* Improved error handling for local_fabric [#936](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/936)
* Improved error handling for extension activation [#967](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/967)

 ![conga comic](https://congacomic.github.io/assets/img/blockheight-52.png)

## 1.0.1: May 23rd 2019

We've reached 10,000 installs :tada: - a big thank you to everyone who has contributed so far!

* Added Export Wallet command [#659](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/659)
* Improved Export Connection Profile command to ask for location to export to [#985](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/985)
* Fixed errors with first tutorial [#969](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/969)
* Allow the user to select to toggle development mode when attempting to debug [#959](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/959)
* Minor bug fixes (862, 865, 885, 887, 935, 964, 973, 976)

![conga comic](https://congacomic.github.io/assets/img/blockheight-51.png)

## 1.0.0: May 9th 2019

* Added Tutorial 2 and 3 and added links [#896](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/896)
* Added tutorial gallery page [#810](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/810)
* Enable SSL target name override for local_fabric nodes [#892](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/892)
* Enable adding private data collections for instantiate and upgrade [#842](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/842)
* Allow transient data to be specified during submitting transaction[#832](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/832)
* Allow JSON as transaction arguments[#915](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/915)
* Update transaction arguments for instantiate and upgrade commands [#950](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/950)
* Removed protcol from peer chaincode address[#930](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/930)
* Renamed Open New Terminal command and enable for all nodes [#624](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/624)
* Allow selection of contacts for generating smart contract tests [#760](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/760)
* Support fabric 1.4.1 [#866](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/866)
* Refactored all extension user settings contributions [#880](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/880)
* Increased and improved telemetry reporting [883](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/883)
* Fix tree population bug after toggling dev mode [#886](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/886)
* Bug fix for generating smart contract tests [#748](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/748)
* Documentation updates (863, 917, 919, 924, 925)
* Minor bug fixes (889, 904, 906, 902, 912, 913, 922, 932)

![conga comic](https://congacomic.github.io/assets/img/blockheight-50.png)

## 0.4.0: May 1st 2019

* Separate wallets and gateways and allow for wallet management [#524](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/524)
* Generate local_fabric from generator_fabric network templates, allowing for service discovery [#776](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/776)
* Support generator_fabric v0.0.27 and use it, not global install [#873](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/873)
* Added inline Introduction Tutorial [#812](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/812)
* Added instantiate and upgrade commands to the debug toolbar [#829](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/829)
* Allow the user to specify an asset type on creating a smart contract project [#826](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/826)
* Improved debug functionality for resuming debugging sessions [#703](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/703)
* Enable TLS support for local_fabric nodes [#852](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/852)
* Refactored “Export Connection Details” command to “Export Connection Profile” [#766](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/766)
* Fixed bug for not packaging when errors occur [#828](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/828)
* Home page updates (791, 850)
* Improved readme (756, 846, 851, 855)
* Minor bug fixes (800, 801, 840, 674)

![conga comic](https://congacomic.github.io/assets/img/blockheight-49.png)

## 0.3.3: March 28th 2019

* generator_fabric@0.0.20 is now bundled with the extension [#722](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/722)
* Enroll a new identity with an enrollment id and secret [#640](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/640)
* Enable creation of Go and Java smart contract projects [#729](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/729)
* Added a "Submit Transaction" button to the debug toolbar [#735](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/735)
* Added Java debugger descriptions [#732](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/732)
* Increased debug timeout [#744](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/744)
* Disconnect from local_fabric on stop or teardown [#751](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/751)
* Fixed bug with watch script causing creating smart contract project to hang [#693](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/693)
* Fixed bug with two "Upgrade smart contract" options appearing in the tree [#774](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/774)

> ⚠ Please note after installing 0.3.3, you may no longer be able to debug existing smart contract projects that are written in TypeScript. You must add the following two settings to your launch configuration in launch.json:
``` "preLaunchTask": "tsc: build - tsconfig.json",
"outFiles": [
    "${workspaceFolder}/dist/**/*.js"
] 
```
> A valid launch configuration is as follows:
``` {
    "type": "fabric:node",
    "request": "launch",
    "name": "Debug Smart Contract",
    "preLaunchTask": "tsc: build - tsconfig.json",
    "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
    ]
} 
```
> Note that the values of the `preLaunchTask` and `outFiles` settings are specific to your project configuration, and the values above are only guaranteed to work with a TypeScript smart contract project generated by this extension.

![conga comic](https://congacomic.github.io/assets/img/blockheight-48.png)

## 0.3.2: March 14th 2019

* Added "Import Package" command [#665](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/665)
* Added "Create Identity (register and enroll)" command [#688](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/688)
* Enabled debugging of Java smart contracts [#617](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/617)
* Fixed bug with connecting with YAML connection profiles [#685](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/685)
* Fixed bug with home directory path in smart contract tests [#692](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/692)
* Fixed instantiated and installed smart contract tree labels not matching [#683](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/683)
* Initial support for language translation [#679](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/679)

![conga comic](https://congacomic.github.io/assets/img/blockheight-47.png)

## 0.3.1: February 28th 2019

* Added new "Local Fabric" output channel view for docker logs [#179](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/179)
* Enabled transaction submission for Go and Java smart contracts [#605](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/605)
* Enabled debugging of Go smart contracts [#616](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/616)
* Added "Evaluate Transaction" command [#656](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/656)
* Show responses for submit and evaluating transactions [#392](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/392)
* Added button for "Create Smart Contract" command [#608](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/608)
* Added button for discovering homepage [#599](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/599)
* Update to use to latest 1.4.1 build for instantiate fix [#587](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/587)
* Enroll admin identity for local fabric runtime [#596](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/596)
* Copy gateway connection profile to extension directory [#630](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/630)
* Display certificate authority for local fabric runtime [#637](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/637)
* Display orderer for local fabric runtime [#622](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/622)
* Allow package command to accept name and version [#616](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/616)
* Improved logging [#479](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/479)
* Fixed bug with smart contract test and discovery [#576](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/576)
* Fixed duplicate home pages issue [#503](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/503)
* Fixed issue with TypeScript tests present in a JavaScript smart contract [#581](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/581)

![conga comic](https://congacomic.github.io/assets/img/blockheight-46.png)

## 0.3.0: February 14th 2019

* Restructured the extension to be gateway and peer orientated, introduced the new Local Fabric Ops view and restructured the Fabric Gateways view [#437](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/437)
* Fixed updating the tree after debug reload [#447](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/447)
* Rebuild binaries to fix extension loading issue [#398](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/398)
* Fixed bug with debugging a javascript smart contract project with typescript tests [#480](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/480)
* Set Go PATH when packaging [#543](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/543)
* Fixed escaping giving arguments for submit transaction command [#534](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/534) [#591](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/591)
* Ensure teardown deletes local_fabric connection details [#438](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/438)
* Ensure sample views update on repo clone [#449](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/449)
* Removed a single contract namespace being shown in the tree [#442](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/442)
* Allow samples to run commands on open [#459](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/459)
* Fixed an issue with teardown failing [#582](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/582)
* Removed dependency on ajv [#300](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/300)
* Added windows to travis CI pipeline, removed appveyor [#557](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/557)
* Other minor bug fixes (472, 481, 502, 505, 506, 556, 570, 574)
* ReadMe updates (550, 551, 552)

![conga comic](https://congacomic.github.io/assets/img/blockheight-45.png)

## 0.2.2: February 7th 2019

* Fix to check if you have xcode [#397](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/397)
* Fix for electron 3 update [#435](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/435)
* Tolerate smart contracts deployed with old programming model [#532](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/532)
* Enhance the extension to fully support service discovery [#530](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/530)

## 0.2.1: January 30th 2019

* Fix for fonts on home/samples pages [#486](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/486)
* Fix for persistently showing output channel [#497](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/497)

## 0.2.0: January 24th 2019

* Fix for naming sample projects [#451](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/451)
* Fix for exporting connection details when connected [#458](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/458)
* Fix for displaying homepage fonts whilst offline [#457](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/457)
* Improved logging [#386](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/386)
* Fix for determining if yo is installed when creating new smart contract projects [#436](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/436)
* Use file system wallets for local_fabric and remote connections [#428](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/428)

![conga comic](https://congacomic.github.io/assets/img/blockheight-44.png)

## 0.1.2: January 17th 2019

* New extension homepage containing quick links to commands, cloning samples and more [#321](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/321)

![conga comic](https://congacomic.github.io/assets/img/blockheight-43.png)

## 0.1.1: January 10th 2019

* Support for the newly released Hyperledger Fabric v1.4 [#441](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/441)
  * Massive congratulations to everyone who contributed to Hyperledger Fabric v1.4!
* Fix the install command not displaying open smart contract projects [#320](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/320)
* Fix for dialog box filtering for json or yaml connection profiles when adding a new connection [#326](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/326)
* Updated packaging documentation [#417](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/417)
* Ask for MSPid if client section of connection profile is missing [#427](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/427)

![conga comic](https://congacomic.github.io/assets/img/blockheight-42.png)

## 0.1.0: December 10th 2018
* Add "export connection details" and "open fabric terminal" commands to tree view when connected [#406](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/406)
* local_fabric ports are no longer random but assigned and then fixed [#388](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/388)
* Generated tests and explorer view make use of new metadata schema [#164](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/164)
* Support for multiple contracts defined in smart contract metadata [#164](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/164)

![conga comic](https://congacomic.github.io/assets/img/blockheight-41.png)

## 0.0.7: December 5th 2018
* Fix a problem with debugging a smart contract [#377](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/377)
* Fix error with metadata so that if an error happens the network tree doesn't break [#370](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/370) 
* Fix when running local_fabric commands stop asking which fabric runtime [#234](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/234)
* Fix generating tests for nested smart contracts [#394](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/394)
* Update the structure of the network tree [#118](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/118)
* Export connection details of the local_fabric runtime [#356](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/356)

![conga comic](https://congacomic.github.io/assets/img/blockheight-40.png)

## 0.0.6: November 26th 2018
* Fix a problem with a looping error [#309](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/309)
* Fix having two ways to add connections and packages [#325](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/325)
* Fix add warning if you delete a connection [#327](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/327)
* Fix specify explicit container names instead of defaults [#347](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/347)
* Save connection details to disk for generating tests
* Enable testing of smart contracts [#313](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/313)
* Add JavaScriptTest Runner as an extension dependency
* Add validation for certificates and private keys [#277](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/277)
* Add submitting a transaction [#293](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/293)
* Updated instantiate command [#279](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/279)
* Add metadata to packages [#292](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/292)
* Update to latest Fabric v1.4 snapshot 
* Add command to open a fabric terminal [#329](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/329)
* Add running Typescript tests [#62](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/62)

![conga comic](https://congacomic.github.io/assets/img/blockheight-39.png)

## 0.0.5: November 8th 2018
* Fix bugs with a connection
* Add ability to debug a typescript smart contract (experimental)[#231](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/231)
* Debug a smart contract automatically packages and installs (experimental) [#287](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/287)
* Install and Instantiate in one action [#12](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/12)
* Improved managed runtime behaviour to no longer create a connection in settings [#113](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/113)
* Enable packaging of Java smart contracts [#280](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/280)
* Enable packaging of Go smart contracts [#281](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/281)

![conga comic](https://congacomic.github.io/assets/img/blockheight-38.png)

## 0.0.4: October 25th 2018
* Fix window reload in middle of unit tests 
* Fix improve error if the npm rebuild fails
* Fix minor changes to the package view
* Fix add work around for hanging on open dialog with a VM
* Fix added in typedefs to tslint [#242](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/242)
* Fix make it easier to run integration tests [#202](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/202)
* Fix Change the Instantiate command to Instantiate / Upgrade [#177](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/177)
* Add export smart contract package command [#210](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/210)
* Updated the README to include the latest features
* Improved adding a new connection [#102](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/102)
* Persist Fabric data in volumes and added teardown command [#190](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/190)
* Updating packaging command to use CDS packages [#208](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/208)
* Automatically build projects before packaging [#178](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/178)
* Add ability to debug javascript smart contracts (experimental) [#236](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/236)

![conga comic](https://congacomic.github.io/assets/img/blockheight-37.png)

## 0.0.3: October 11th, 2018
* Fix JavaScript packages being packaged as TypeScript [#139](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/139)
* Fix Show an error if you try and instantiate with no installed packages [#140](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/140)
* Improve Tooltip for local_fabric runtime [#146](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/146)
* Automate extension publishing [#156](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/156)
* Add support for local_fabric runtime on Windows [#167](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/167)

![conga comic](https://congacomic.github.io/assets/img/blockheight-36.png)
