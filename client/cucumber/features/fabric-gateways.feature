Feature: Fabric Gateways
    Description about feature here

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
        And a <contractLanguage> smart contract for 'Generated' assets with the name '<contractName>' and version '0.0.1'
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I generate a <testLanguage> functional test for a <contractLanguage> contract
        Then a functional test file with the filename 'GeneratedContract-<contractName>@0.0.1.test.<fileExtension>' should exist and contain the correct contents
        And the tests should be runnable
        Examples:
            | contractName | contractLanguage | testLanguage | fileExtension |
            | contract1    | JavaScript       | JavaScript   | js            |
            | contract2    | JavaScript       | TypeScript   | ts            |
            | contract3    | TypeScript       | JavaScript   | js            |
            | contract4    | TypeScript       | TypeScript   | ts            |



