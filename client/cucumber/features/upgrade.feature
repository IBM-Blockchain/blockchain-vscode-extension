Feature: Upgrade Smart Contracts
    Description about feature here

    Scenario: Upgrade a JavaScript smart contract
        Given a JavaScript smart contract for 'Pigeon' assets with the name 'UpgradedContractJavaScript' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        And the contract version has been updated to '0.0.2'
        And the contract has been packaged
        And the package has been installed
        When I upgrade the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'UpgradedContractJavaScript@0.0.2' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'


    Scenario: Upgrade a TypeScript smart contract
        Given a TypeScript smart contract for 'Pigeon' assets with the name 'UpgradedContractTypeScript' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        And the contract version has been updated to '0.0.2'
        And the contract has been packaged
        And the package has been installed
        When I upgrade the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'UpgradedContractTypeScript@0.0.2' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'

    Scenario: Upgrade a Java smart contract
        Given a Java smart contract for 'null' assets with the name 'UpgradedContractJava' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        And the contract version has been updated to '0.0.2'
        And the contract has been packaged
        And the package has been installed
        When I upgrade the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'UpgradedContractJava@0.0.2' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'

    Scenario: Upgrade a Go smart contract
        Given a Go smart contract for 'null' assets with the name 'UpgradedContractGo' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        And the contract version has been updated to '0.0.2'
        And the contract has been packaged
        And the package has been installed
        When I upgrade the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'UpgradedContractGo@0.0.2' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'
