Feature: Submit transaction
    Description about feature here

    Scenario: Submit a transaction for a JavaScript smart contract
        Given a JavaScript smart contract for 'Pigeon' assets with the name 'TransactionContractJavaScript' and version '0.0.1'
        And the Local Fabric is running
        And connected to the 'Local Fabric' gateway
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I submit the transaction 'createPigeon' with args '["PIGEON_001", "Big Pigeon"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createPigeon'

