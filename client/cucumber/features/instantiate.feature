Feature: Instantiate Smart Contracts
    Description about feature here

    Scenario: Instantiate a JavaScript smart contract
        Given a JavaScript smart contract for 'Wagonwheel' assets with the name 'InstantiatedContractJavaScript' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        When I instantiate the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'InstantiatedContractJavaScript@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'

    Scenario: Instantiate a TypeScript smart contract
        Given a TypeScript smart contract for 'Wagonwheel' assets with the name 'InstantiatedContractTypeScript' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        When I instantiate the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'InstantiatedContractTypeScript@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'

    Scenario: Instantiate a Java smart contract
        Given a Java smart contract for 'null' assets with the name 'InstantiatedContractJava' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        When I instantiate the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'InstantiatedContractJava@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'

    Scenario: Instantiate a Go smart contract
        Given a Go smart contract for 'null' assets with the name 'InstantiatedContractGo' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        When I instantiate the installed package with the transaction '' and args '', not using private data
        Then there should be a instantiated smart contract tree item with a label 'InstantiatedContractGo@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'
