Feature: Local Fabric Ops
    Tests all the features of the fabric ops panel

    Scenario Outline: There should be a tree item (disconnected)
        Given the Local Fabric is running
        Then there should be a tree item with a label '<label>' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to '<tooltip>'
        Examples:
        | label                  | tooltip                                  |
        | Local Fabric  ●        | The local development runtime is running |

    Scenario Outline: There should be a tree item (connected)
        Given the Local Fabric is running
        And the 'Local Fabric' environment is connected
        Then there should be a <treeItem> tree item with a label '<label>' in the 'Local Fabric Ops' panel
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
        Then there should be a tree item with a label '<label>' in the 'Local Fabric Ops' panel
        Then the tree item should have a tooltip equal to '<tooltip>'
        When I start the Local Fabric
        And the 'Local Fabric' environment is connected
        Then there should be a instantiated smart contract tree item with a label '<instantiatedName>' in the 'Local Fabric Ops' panel
        Examples:
        | language   | assetType | name               | instantiatedName         | version | label                            | tooltip                                                                    |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.2 | 0.0.2   | Local Fabric  ○ (click to start) | Creates a local development runtime using Hyperledger Fabric Docker images |

    Scenario Outline: After tear down and start there are no smart contracts
        Given the Local Fabric is running
        And the 'Local Fabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version> 
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I tear down the Local Fabric
        Then there should be a tree item with a label 'Local Fabric  ○ (click to start)' in the 'Local Fabric Ops' panel
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.2   | 
