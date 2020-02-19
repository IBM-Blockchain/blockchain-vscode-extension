Feature: Fabric Gateways
    Test all the features of a fabric gateway

    Scenario: Connect with admin identity
        Given the Local Fabric is running
        And the 'Org1' wallet
        And the 'Local Fabric Admin' identity
        When connecting to the 'Local Fabric - Org1' gateway
        Then there should be a tree item with a label 'Connected via gateway: Local Fabric - Org1' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Connected via gateway: Local Fabric - Org1'
        And there should be a tree item with a label 'Using ID: org1Admin' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Using ID: org1Admin'
        And there should be a tree item with a label 'Channels' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Channels'

    Scenario: Connect with another identity
        Given the Local Fabric is running
        And the '1 Org Local Fabric' environment is connected
        And the 'Org1' wallet
        And the identity 'new_identity' exists
        When connecting to the 'Local Fabric - Org1' gateway
        Then there should be a tree item with a label 'Connected via gateway: Local Fabric - Org1' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Connected via gateway: Local Fabric - Org1'
        And there should be a tree item with a label 'Using ID: new_identity' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Using ID: new_identity'

    Scenario: Export connection profile
        Given the Local Fabric is running
        And the '1 Org Local Fabric' environment is connected
        And the 'Org1' wallet
        And the identity 'new_identity' exists
        And the gateway '1 Org Local Fabric - Org1' is created
        When I export the connection profile
        Then a connection profile exists

    @otherFabric
    Scenario: Create another gateway
        When I create a gateway 'myGateway' from a 'profile'
        Then there should be a tree item with a label 'myGateway' in the 'Fabric Gateways' panel

    @otherFabric
    Scenario: Connect to another gateway
        Given the gateway 'myGateway' is created
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        Then there should be a tree item with a label 'myGateway' in the 'Fabric Gateways' panel
        When connecting to the 'myGateway' gateway without association
        Then there should be a tree item with a label 'Connected via gateway: myGateway' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Connected via gateway: myGateway'
        And there should be a tree item with a label 'Using ID: conga' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Using ID: conga'
        And there should be a tree item with a label 'Channels' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Channels'

    @otherFabric
    Scenario: Create a gateway from an environment
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        When I create a gateway 'gatewayFromEnv' from an 'environment'
        Then there should be a tree item with a label 'gatewayFromEnv ⧉' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'ⓘ Associated wallet:\n    myWallet'
        When connecting to the 'gatewayFromEnv' gateway
        Then there should be a tree item with a label 'Connected via gateway: gatewayFromEnv' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Connected via gateway: gatewayFromEnv'

    @ansibleFabric
    Scenario: Create a gateway from an ansible environment
        Given an environment 'myAnsibleFabric' exists
        Given the 'admin' identity
        Then there should be a tree item with a label 'myAnsibleFabric - Org1 gateway ⧉' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'ⓘ Associated wallet:\n    Org1'
        Then there should be a tree item with a label 'myAnsibleFabric - Org2 gateway ⧉' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'ⓘ Associated wallet:\n    Org2'
        When connecting to the 'myAnsibleFabric - Org1 gateway' gateway
        Then there should be a tree item with a label 'Connected via gateway: myAnsibleFabric - Org1 gateway' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Connected via gateway: myAnsibleFabric - Org1 gateway'    

    @otherFabric
    Scenario: Export connection profile
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        And the gateway 'myGateway' is created
        When I export the connection profile
        Then a connection profile exists

    Scenario Outline: Generating tests for a contract (local fabric)
        Given the Local Fabric is running
        And the '1 Org Local Fabric' environment is connected
        And the 'Org1' wallet
        And the 'Local Fabric Admin' identity
        And I'm connected to the 'Local Fabric - Org1' gateway
        And a <contractLanguage> smart contract for <assetType> assets with the name <contractName> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        When I generate a <testLanguage> functional test for a <contractLanguage> contract
        Then a functional test file with .<fileExtension> extension for the <testLanguage> contract <contractName> version <version> with assets <assetType> should exist and contain the correct contents
        And the tests should be runnable
        Examples:
            | contractName        | assetType | contractLanguage | testLanguage | fileExtension | version |
            | JavaScriptContract  | Conga     | JavaScript       | JavaScript   | js            | 0.0.1   |
            | JavaScriptContract2 | Conga     | JavaScript       | TypeScript   | ts            | 0.0.1   |
            | TypeScriptContract  | Conga     | TypeScript       | JavaScript   | js            | 0.0.1   |
            | TypeScriptContract2 | Conga     | TypeScript       | TypeScript   | ts            | 0.0.1   |
            | JavaContract        | Conga     | Java             | Java         | java          | 0.0.1   |

    @otherFabric
    Scenario Outline: Generating tests for a contract (other fabric)
        Given the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And an environment 'myFabric' exists
        And the environment is setup
        And the 'myFabric' environment is connected
        And a <contractLanguage> smart contract for <assetType> assets with the name <contractName> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        And the gateway 'myGateway' is created
        And I'm connected to the 'myGateway' gateway without association
        When I generate a <testLanguage> functional test for a <contractLanguage> contract
        Then a functional test file with .<fileExtension> extension for the <testLanguage> contract <contractName> version <version> with assets <assetType> should exist and contain the correct contents
        And the tests should be runnable
        Examples:
            | contractName       | assetType | contractLanguage | testLanguage | fileExtension | version |
            | TypeScriptContract | Conga     | TypeScript       | JavaScript   | js            | 0.0.1   |
            | JavaContract       | Conga     | Java             | Java         | java          | 0.0.1   |
