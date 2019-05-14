Feature: Install Smart Contract
    Description about feature here

    Scenario: Install a JavaScript smart contract
        Given a JavaScript smart contract for 'Biscuit' assets with the name 'InstallContractJavaScript' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        When I install the package
        Then there should be a installed smart contract tree item with a label 'InstallContractJavaScript@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Installed on: peer0.org1.example.com'

    Scenario: Install a TypeScript smart contract
        Given a TypeScript smart contract for 'Biscuit' assets with the name 'InstallContractTypeScript' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        When I install the package
        Then there should be a installed smart contract tree item with a label 'InstallContractTypeScript@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Installed on: peer0.org1.example.com'

    Scenario: Install a Java smart contract
        Given a Java smart contract for 'null' assets with the name 'InstallContractJava' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        When I install the package
        Then there should be a installed smart contract tree item with a label 'InstallContractJava@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Installed on: peer0.org1.example.com'


    Scenario: Install a Go smart contract
        Given a Go smart contract for 'null' assets with the name 'InstallContractGo' and version '0.0.1'
        And the Local Fabric is running
        And the contract has been created
        And the contract has been packaged
        When I install the package
        Then there should be a installed smart contract tree item with a label 'InstallContractGo@0.0.1' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'Installed on: peer0.org1.example.com'
