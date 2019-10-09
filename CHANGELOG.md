# IBM Blockchain Platform Extension Change Log

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
