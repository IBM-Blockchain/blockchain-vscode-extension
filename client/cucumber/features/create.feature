Feature: Created Smart Contracts
    Description about feature here

    Scenario: Create a JavaScript smart contract
        Given a JavaScript smart contract for 'Conga' assets with the name 'CreatedContractJavaScript' and version '0.0.1'
        And the contract hasn't been created already
        When I create the contract
        Then a new contract directory should exist

    Scenario: Create a TypeScript smart contract
        Given a TypeScript smart contract for 'Conga' assets with the name 'CreatedContractTypescriptScript' and version '0.0.1'
        And the contract hasn't been created already
        When I create the contract
        Then a new contract directory should exist

    Scenario: Create a Java smart contract
        Given a Java smart contract for 'null' assets with the name 'CreatedContractJava' and version '0.0.1'
        And the contract hasn't been created already
        When I create the contract
        Then a new contract directory should exist

    Scenario: Create a Go smart contract
        Given a Go smart contract for 'null' assets with the name 'CreatedContractGo' and version '0.0.1'
        And the contract hasn't been created already
        When I create the contract
        Then a new contract directory should exist
