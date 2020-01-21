Feature: Evaluate transaction
    Test evaluating a transaction

    # Scenario Outline: Evaluate a transaction for a smart contract (local fabric)
    #     Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    #     And the Local Fabric is running
    #     And the 'Local Fabric' environment is connected
    #     And I'm connected to the 'Local Fabric' gateway
    #     And the contract has been created
    #     And the contract has been packaged
    #     And the package has been installed
    #     And the contract has been instantiated with the transaction '' and args '', not using private data
    #     And the transaction 'createConga' has been submitted with args '["Conga_001", "Big Conga"]'
    #     When I evaluate the transaction 'readConga' with args '["Conga_001"]'
    #     Then the logger should have been called with 'SUCCESS', 'Successfully evaluated transaction' and 'Returned value from readConga: {"value":"Big Conga"}'
    #     Examples:
    #     | language   | assetType | name               | version |
    #     | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
    #     | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
    #     | Java       | Conga     | JavaContract       | 0.0.1   |
    #     | Go         | null      | GoContract         | 0.0.1   |

    # @otherFabric
    # Scenario Outline: Evaluate a transaction for a smart contract (other fabric)
    #     Given an environment 'myFabric' exists
    #     And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    #     And the environment is setup
    #     And the 'myFabric' environment is connected
    #     And a <language> smart contract for <assetType> assets with the name <name> and version <version>
    #     And the contract has been created
    #     And the contract has been packaged
    #     And the package has been installed
    #     And the contract has been instantiated with the transaction '' and args '', not using private data
    #     And the gateway 'myGateway' is created
    #     And I'm connected to the 'myGateway' gateway without association
    #     And the transaction 'createConga' has been submitted with args '["Conga_001", "Big Conga"]'
    #     When I evaluate the transaction 'readConga' with args '["Conga_001"]'
    #     Then the logger should have been called with 'SUCCESS', 'Successfully evaluated transaction' and 'Returned value from readConga: {"value":"Big Conga"}'
    #     Examples:
    #     | language   | assetType | name               | version |
    #     | Java       | Conga     | JavaContract       | 0.0.1   |
    #     | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
