Feature: Fabric Environments
    Tests all the features of the fabric ops panel

    Scenario Outline: There should be a tree item (disconnected)
        Given the Local Fabric is running
        Then there should be a tree item with a label '<label>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to '<tooltip>'
        Examples:
        | label                  | tooltip                                  |
        | Local Fabric  ●        | The local development runtime is running |

    Scenario Outline: There should be a tree item (connected)
        Given the Local Fabric is running
        And the 'Local Fabric' environment is connected
        Then there should be a <treeItem> tree item with a label '<label>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to '<tooltip>'
        Examples:
        | treeItem                    | label                  | tooltip                |
        | installed smart contract    | + Install              | + Install              |
        | instantiated smart contract | + Instantiate          | + Instantiate          |
        | Channels                    | mychannel              | mychannel              |
        | Node                        | peer0.org1.example.com | peer0.org1.example.com |
        | Node                        | ca.org1.example.com    | ca.org1.example.com    |
        | Node                        | orderer.example.com    | orderer.example.com    |
        | Organizations               | OrdererMSP             | OrdererMSP             |
        | Organizations               | Org1MSP                | Org1MSP                |

    Scenario Outline: It should open the terminal
        Given the Local Fabric is running
        And the 'Local Fabric' environment is connected
        When I open the terminal for node '<nodeType>'
        Then there should be a terminal open
        Examples:
        | nodeType       |
        | fabric-peer    |
        | fabric-ca      |
        | fabric-orderer |

    Scenario Outline: It should persist data after being stopped
        Given the Local Fabric is running
        And the 'Local Fabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I stop the Local Fabric
        Then there should be a tree item with a label '<label>' in the 'Fabric Environments' panel
        Then the tree item should have a tooltip equal to '<tooltip>'
        When I start the Local Fabric
        And the 'Local Fabric' environment is connected
        Then there should be a instantiated smart contract tree item with a label '<instantiatedName>' in the 'Fabric Environments' panel
        Examples:
        | language   | assetType | name               | instantiatedName         | version | label                            | tooltip                                                                    |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.2 | 0.0.2   | Local Fabric  ○ (click to start) | Creates a local development runtime using Hyperledger Fabric Docker images |

    Scenario Outline: After teardown and start there are no smart contracts
        Given the Local Fabric is running
        And the 'Local Fabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I teardown the Local Fabric
        Then there should be a tree item with a label 'Local Fabric  ○ (click to start)' in the 'Fabric Environments' panel
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.2   |


    @otherFabric
    Scenario: It should create an environment
        When I create an environment 'myFabric'
        Then there should be a tree item with a label 'myFabric' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'myFabric'

    @otherFabric
    Scenario Outline: It should setup environment
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        When I connect to the environment 'myFabric'
        Then there should be a tree item with a label '<label>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to '<tooltip>'
        Examples:
        | label                              | tooltip                            |
        | Setting up: myFabric               | Setting up: myFabric               |
        | (Click each node to perform setup) | (Click each node to perform setup) |
        | ca.example.com   ⚠                 | ca.example.com                     |
        | orderer.example.com   ⚠            | orderer.example.com                |
        | peer0.org1.example.com   ⚠         | peer0.org1.example.com             |

    @otherFabric
    Scenario Outline: It should associate nodes with identities
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the 'myFabric' environment is connected
        When I associate identity '<identity>' in wallet '<wallet>' with node '<name>'
        Then the log should have been called with 'SUCCESS' and 'Successfully associated node <name> with wallet <wallet> and identity <identity>'
        Examples:
        | name                    | wallet   | identity |
        | peer0.org1.example.com  | myWallet | conga    |
        | orderer.example.com     | myWallet | conga    |
        | ca.example.com          | myWallet | conga2   |


    @otherFabric
    Scenario Outline: It should connect to an environment
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        When I connect to the environment 'myFabric'
        Then there should be a <treeItem> tree item with a label '<label>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to '<tooltip>'
        Examples:
        | treeItem                    | label                  | tooltip                |
        | installed smart contract    | + Install              | + Install              |
        | instantiated smart contract | + Instantiate          | + Instantiate          |
        | Channels                    | mychannel              | mychannel              |
        | Node                        | peer0.org1.example.com | peer0.org1.example.com |
        | Node                        | ca.example.com         | ca.example.com         |
        | Node                        | orderer.example.com    | orderer.example.com    |
        | Organizations               | OrdererMSP             | OrdererMSP             |
        | Organizations               | Org1MSP                | Org1MSP                |

    @otherFabric
    Scenario Outline: It should instantiate a smart contract
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        And the 'myFabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        When I instantiate the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label '<instantiatedName>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'
        Examples:
        | language   | assetType | name               | instantiatedName         | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |

    @otherFabric
    Scenario Outline: It should upgrade a smart contract
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        And the 'myFabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        And the contract version has been updated to '0.0.2'
        And the contract has been packaged
        And the package has been installed
        When I upgrade the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label '<upgradedName>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'
        Examples:
        | language   | assetType | name               | upgradedName              | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.2  | 0.0.1   |

    @otherFabric
    Scenario: It should delete an environment
        Given an environment 'myFabric2' exists
        When I delete an environment 'myFabric2'
        Then there shouldn't be a tree item with a label 'myFabric2' in the 'Fabric Environments' panel
