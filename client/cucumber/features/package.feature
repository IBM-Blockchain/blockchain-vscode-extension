Feature: Packaged Smart Contracts
    Description about feature here

    Scenario: Package JavaScript a smart contract
        Given a JavaScript smart contract for 'Pineapple' assets with the name 'PackageContractJavaScript' and version '0.0.1'
        And the contract has been created
        When I package the contract
        Then a new package should be created with the name 'PackageContractJavaScript' and verison '0.0.1'
        And there should be a tree item with a label 'PackageContractJavaScript@0.0.1' in the 'Smart Contract Packages' panel
        And the tree item should have a tooltip equal to 'PackageContractJavaScript@0.0.1'

    Scenario: Package a TypeScript smart contract
        Given a TypeScript smart contract for 'Pineapple' assets with the name 'PackageContractTypeScript' and version '0.0.1'
        And the contract has been created
        When I package the contract
        Then a new package should be created with the name 'PackageContractTypeScript' and verison '0.0.1'
        And there should be a tree item with a label 'PackageContractTypeScript@0.0.1' in the 'Smart Contract Packages' panel
        And the tree item should have a tooltip equal to 'PackageContractTypeScript@0.0.1'

    Scenario: Package a Java smart contract
        Given a Java smart contract for 'null' assets with the name 'PackageContractJava' and version '0.0.1'
        And the contract has been created
        When I package the contract
        Then a new package should be created with the name 'PackageContractJava' and verison '0.0.1'
        And there should be a tree item with a label 'PackageContractJava@0.0.1' in the 'Smart Contract Packages' panel
        And the tree item should have a tooltip equal to 'PackageContractJava@0.0.1'

    Scenario: Package a Go smart contract
        Given a Go smart contract for 'null' assets with the name 'PackageContractGo' and version '0.0.1'
        And the contract has been created
        When I package the contract
        Then a new package should be created with the name 'PackageContractGo' and verison '0.0.1'
        And there should be a tree item with a label 'PackageContractGo@0.0.1' in the 'Smart Contract Packages' panel
        And the tree item should have a tooltip equal to 'PackageContractGo@0.0.1'
