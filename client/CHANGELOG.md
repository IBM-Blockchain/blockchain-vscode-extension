# IBM Blockchain Platform Extension Change Log

## 0.0.3: October 11th, 2018
* Fix JavaScript packages being packaged as TypeScript [#139](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/139)
* Fix Show an error if you try and instantiate with no installed packages [#140](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/140)
* Improve Tooltip for local_fabric runtime [#146](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/146)
* Automate extension publishing [#156](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/156)
* Add support for local_fabric runtime on Windows [#167](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/167)

![conga comic](https://congacomic.github.io/assets/img/blockheight-36.png)

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

## 0.0.5: November 8th 2018
* Fix bugs with a connection
* Add ability to debug a typescript smart contract (experimental)[#231](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/231)
* Debug a smart contract automatically packages and installs (experimental) [#287](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/287)
* Install and Instantiate in one action [#12](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/12)
* Improved managed runtime behaviour to no longer create a connection in settings [#113](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/113)
* Enable packaging of Java smart contracts [#280](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/280)
* Enable packaging of Go smart contracts [#281](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/281)

![conga comic](https://congacomic.github.io/assets/img/blockheight-38.png)

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

## 0.0.7: December 5th 2018
* Fix a problem with debugging a smart contract [#377](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/377)
* Fix error with metadata so that if an error happens the network tree doesn't break [#370](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/370) 
* Fix when running local_fabric commands stop asking which fabric runtime [#234](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/234)
* Fix generating tests for nested smart contracts [#394](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/394)
* Update the structure of the network tree [#118](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/118)
* Export connection details of the local_fabric runtime [#356](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/356)

![conga comic](https://congacomic.github.io/assets/img/blockheight-40.png)

## 0.1.0: December 10th 2018
* Add "export connection details" and "open fabric terminal" commands to tree view when connected [#406](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/406)
* local_fabric ports are no longer random but assigned and then fixed [#388](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/388)
* Generated tests and explorer view make use of new metadata schema [#164](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/164)
* Support for multiple contracts defined in smart contract metadata [#164](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/164)

![conga comic](https://congacomic.github.io/assets/img/blockheight-41.png)

## 0.1.1: January 10th 2019

* Support for the newly released Hyperledger Fabric v1.4 [#441](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/441)
  * Massive congratulations to everyone who contributed to Hyperledger Fabric v1.4!
* Fix the install command not displaying open smart contract projects [#320](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/320)
* Fix for dialog box filtering for json or yaml connection profiles when adding a new connection [#326](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/326)
* Updated packaging documentation [#417](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/417)
* Ask for MSPid if client section of connection profile is missing [#427](https://github.com/IBM-Blockchain/blockchain-vscode-extension/issues/427)

![conga comic](https://congacomic.github.io/assets/img/blockheight-42.png)

## 0.1.2: January 17th 2019

* New extension homepage containing quick links to commands, cloning samples and more [#321](https://github.com/ibm-blockchain/blockchain-vscode-extension/issues/321)

![conga comic](https://congacomic.github.io/assets/img/blockheight-43.png)