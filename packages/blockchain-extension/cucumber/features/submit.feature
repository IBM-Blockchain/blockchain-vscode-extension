Feature: Submit transaction
    Test submitting a transaction

    Scenario Outline: Submit a transaction for a smart contract (local fabric)
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the Local Fabric is running
        And the 'Local Fabric' environment is connected
        And the 'Org1' wallet
        And the 'Local Fabric Admin' identity
        And I'm connected to the 'Local Fabric - Org1' gateway
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        When I submit the transaction 'createConga' on the channel 'mychannel' with args '["Conga_001", "Big Conga"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createConga'
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
        | Java       | Conga     | JavaContract       | 0.0.1   |
        | Go         | null      | GoContract         | 0.0.1   |


    Scenario Outline: Submit a transaction for a smart contract using generated transaction data
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the Local Fabric is running
        And the 'Local Fabric' environment is connected
        And the 'Org1' wallet
        And the 'Local Fabric Admin' identity
        And I'm connected to the 'Local Fabric - Org1' gateway
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        And the contract has been associated with a directory of transaction data
        When I submit the transaction 'createConga' on the channel 'mychannel' using the transaction data labelled 'A test createConga transaction'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createConga'
        Examples:
        | language   | assetType | name               | version |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |

    @otherFabric
    Scenario Outline: Submit a transaction for a smart contract (other fabric)
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        And the 'myFabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        And the gateway 'myGateway' is created
        And I'm connected to the 'myGateway' gateway without association
        When I submit the transaction 'createConga' on the channel 'mychannel' with args '["Conga_001", "Big Conga"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createConga'
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
        | Java       | Conga     | JavaContract       | 0.0.1   |

    @opsToolsFabric
    Scenario Outline: Submit a transaction for a smart contract (OpsTool environment)
        Given an environment 'myOpsToolsFabric' exists
        And the wallet 'opsToolsWallet' with identity 'Org1CAAdmin' and mspid 'org1msp' exists
        And the wallet 'opsToolsWallet' with identity 'Org2CAAdmin' and mspid 'org2msp' exists
        And the wallet 'opsToolsWallet' with identity 'OrderingServiceCAAdmin' and mspid 'osmsp' exists
        And the wallet 'opsToolsWallet' with identity 'OrderingServiceMSPAdmin' and mspid 'osmsp' exists
        And the wallet 'opsToolsWallet' with identity 'OrderingServiceMSPAdmin' and mspid 'osmsp' exists
        And the wallet 'opsToolsWallet' with identity 'Org1MSPAdmin' and mspid 'org1msp' exists
        And the wallet 'opsToolsWallet' with identity 'Org2MSPAdmin' and mspid 'org2msp' exists
        And I have edited filters and imported all nodes to environment 'myOpsToolsFabric'
        And the opstools environment is setup
        And the 'myOpsToolsFabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And I have created a gateway 'myOpsGateway' from an 'environment'
        And the 'opsToolsWallet' wallet
        And the 'Org1MSPAdmin' identity
        And I'm connected to the 'myOpsGateway' gateway
        When I submit the transaction 'readConga' on the channel 'channel1' with args '["001"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'Returned value from readConga: {"value":"newAsset"}'
        Examples:
        | language   | assetType | name               | version |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
