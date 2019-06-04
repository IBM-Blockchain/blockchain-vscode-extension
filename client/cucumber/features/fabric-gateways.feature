Feature: Fabric Gateways
    Test all the features of a fabric gateway

    Scenario: Connect with admin identity
        Given the Local Fabric is running
        And the 'Local Fabric' wallet
        And the 'Local Fabric Admin' identity
        When connecting to the 'Local Fabric' gateway
        Then there should be a tree item with a label 'Connected via gateway: local_fabric' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Connected via gateway: local_fabric'
        And there should be a tree item with a label 'Using ID: admin' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Using ID: admin'
        And there should be a tree item with a label 'Channels' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Channels'

    Scenario: Connect with another identity
        Given the Local Fabric is running
        And the 'Local Fabric' wallet
        And the identity 'new_identity' exists
        When connecting to the 'Local Fabric' gateway
        Then there should be a tree item with a label 'Connected via gateway: local_fabric' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Connected via gateway: local_fabric'
        And there should be a tree item with a label 'Using ID: new_identity' in the 'Fabric Gateways' panel
        And the tree item should have a tooltip equal to 'Using ID: new_identity'


     Scenario Outline: Generating <testLanguage> tests for a <contractLanguage> contract
        Given the Local Fabric is running
        And the 'Local Fabric' wallet
        And the 'Local Fabric Admin' identity
        And connected to the 'Local Fabric' gateway
        And a <contractLanguage> smart contract for <assetType> assets with the name <contractName> and version <version>
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I generate a <testLanguage> functional test for a <contractLanguage> contract
        Then a functional test file with the filename '<assetType>Contract-<contractName>@0.0.1.test.<fileExtension>' should exist and contain the correct contents
        And the tests should be runnable
        Examples:
        | contractName        | assetType | contractLanguage | testLanguage | fileExtension | version |
        | JavaScriptContract  | Conga     | JavaScript       | JavaScript   | js            | 0.0.1   |
        | JavaScriptContract2 | Conga     | JavaScript       | TypeScript   | ts            | 0.0.1   |
        | TypeScriptContract  | Conga     | TypeScript       | JavaScript   | js            | 0.0.1   |
        | TypeScriptContract2 | Conga     | TypeScript       | TypeScript   | ts            | 0.0.1   |
