Feature: Submit transaction
    Test submitting a transaction

    Scenario Outline: Submit a transaction for a smart contract (local fabric)
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the 1 Org Local Fabric environment is running
        And the '1 Org Local Fabric' environment is connected
        And the 'Org1' wallet
        And the 'Local Fabric Admin' identity
        And I'm connected to the '1 Org Local Fabric - Org1' gateway
        And the contract has been created
        And the contract has been packaged
#        And the package has been installed
#        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
#        When I submit the transaction 'createConga' on the channel 'mychannel' with args '["Conga_001", "Big Conga"]'
#        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createConga'
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
        | Java       | Conga     | JavaContract       | 0.0.1   |
        | Go         | null      | GoContract         | 0.0.1   |


     Scenario Outline: Submit a transaction for a smart contract using generated transaction data
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the 1 Org Local Fabric environment is running
        And the '1 Org Local Fabric' environment is connected
        And the 'Org1' wallet
        And the 'Local Fabric Admin' identity
        And I'm connected to the '1 Org Local Fabric - Org1' gateway
        And the contract has been created
        And the contract has been packaged
#        And the package has been installed
#        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
#        And the contract has been associated with a directory of transaction data
#        When I submit the transaction 'createConga' on the channel 'mychannel' using the transaction data labelled 'A test createConga transaction'
#        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createConga'
        Examples:
        | language   | assetType | name               | version |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |

     @ansibleFabric
     Scenario Outline: Submit a verify transaction for a private data smart contract
        Given a private <language> smart contract for <assetType> assets with the name <name> and version <version> and mspid <mspid>
        Given an environment 'myAnsibleFabric' exists
        And the 'myAnsibleFabric' environment is connected
        And the 'admin' identity
        And I'm connected to the 'myAnsibleFabric - Org1 gateway' gateway
        And the private contract has been created
        And the contract has been packaged
        And the package has been installed
#        And the contract has been instantiated with the transaction '' and args '', using private data on channel 'channel1'
#        When I submit the transaction 'createPrivateConga' on the channel 'channel1' with args '["001"]' and with the transient data '{"privateValue":"125"}'
#        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createPrivateConga'
#        When I submit the transaction 'verifyPrivateConga' on the channel 'channel1' with args '["001", "{\"privateValue\":\"125\"}"]'
#        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'Returned value from verifyPrivateConga: true'
        Examples:
        | language   | assetType        | name                      | mspid      | version |
        | JavaScript | PrivateConga     | PrivateJavaScriptContract | Org1MSP    | 0.0.1   |
        | TypeScript | PrivateConga     | PrivateTypeScriptContract | Org1MSP    | 0.0.1   |
        | Java       | PrivateConga     | PrivateJavaContract       | Org1MSP    | 0.0.1   |


    @otherFabric
    Scenario Outline: Submit a transaction for a smart contract (other fabric)
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        And the 'myFabric' environment is connected
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the contract has been deployed on channel 'mychannel'
        And the gateway 'myGateway' is created
        And I'm connected to the 'myGateway' gateway without association
        When I submit the transaction 'createCongaTwo' on the channel 'mychannel' with args '["Conga_001", "Big Conga"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createCongaTwo'
        Examples:
        | language   | assetType    | name               | version |
        | JavaScript | CongaTwo     | JavaScriptContract | 0.0.1   |
        | Java       | CongaTwo     | JavaContract       | 0.0.1   |

    @opsToolsFabric
    Scenario Outline: Submit a transaction for a smart contract (OpsTool software environment)
        Given an environment 'myOpsToolsFabric' of type 'software' exists
        And the wallet 'opsToolsWallet' with identity 'Org1CAAdmin' and mspid 'org1msp' exists
        And the wallet 'opsToolsWallet' with identity 'Org2CAAdmin' and mspid 'org2msp' exists
        And the wallet 'opsToolsWallet' with identity 'OrderingServiceCAAdmin' and mspid 'osmsp' exists
        And the wallet 'opsToolsWallet' with identity 'OrderingServiceMSPAdmin' and mspid 'osmsp' exists
        And the wallet 'opsToolsWallet' with identity 'OrderingServiceMSPAdmin' and mspid 'osmsp' exists
        And the wallet 'opsToolsWallet' with identity 'Org1MSPAdmin' and mspid 'org1msp' exists
        And the wallet 'opsToolsWallet' with identity 'Org2MSPAdmin' and mspid 'org2msp' exists
        And I have edited filters and imported all nodes to environment 'myOpsToolsFabric'
        And the 'software' opstools environment is setup
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

    @opsToolsFabric
    Scenario Outline: Submit a transaction for a smart contract (OpsTool SaaS environment)
        Given an environment 'mySaaSOpsToolsFabric' of type 'SaaS' exists
        And the wallet 'SaaSOpsToolsWallet' with identity 'SaaSOrg1CAAdmin' and mspid 'org1msp' exists
        And the wallet 'SaaSOpsToolsWallet' with identity 'SaaSOrderingServiceCAAdmin' and mspid 'osmsp' exists
        And the wallet 'SaaSOpsToolsWallet' with identity 'SaaSOrderingServiceMSPAdmin' and mspid 'osmsp' exists
        And the wallet 'SaaSOpsToolsWallet' with identity 'SaaSOrg1MSPAdmin' and mspid 'org1msp' exists
        And I have edited filters and imported all nodes to environment 'mySaaSOpsToolsFabric'
        And the 'SaaS' opstools environment is setup
        And the 'mySaaSOpsToolsFabric' environment is connected      
        And a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And I have created a gateway 'mySaaSOpsGateway' from an 'environment'
        And the 'SaaSOpsToolsWallet' wallet
        And the 'SaaSOrg1MSPAdmin' identity
        And I'm connected to the 'mySaaSOpsGateway' gateway
        When I submit the transaction 'readConga' on the channel 'channel1' with args '["001"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'Returned value from readConga: {"value":"newAsset"}'
        Examples:
        | language   | assetType | name               | version |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
