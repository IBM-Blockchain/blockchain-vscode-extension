Feature: Evaluate transaction
    Test evaluating a transaction

    Scenario Outline: Evaluate a transaction for a smart contract (local fabric)
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the Local Fabric is running
        And I'm connected to the 'Local Fabric' gateway
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I evaluate the transaction 'createConga' with args '["Conga_002", "Big Conga"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully evaluated transaction' and 'No value returned from createConga'
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
        | Java       | null      | JavaContract       | 0.0.1   |
        | Go         | null      | GoContract         | 0.0.1   |

    @otherFabric
    Scenario Outline: Evaluate a transaction for a smart contract (other fabric)
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the gateway 'myGateway' is created
        And I'm connected to the 'myGateway' gateway without association
        And the other fabric is setup with contract name <name> and version <version>
        When I evaluate the transaction 'createConga' with args '["Conga_002", "Big Conga"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully evaluated transaction' and 'No value returned from createConga'
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
