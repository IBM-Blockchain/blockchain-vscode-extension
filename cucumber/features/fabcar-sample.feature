Feature: FabCar Sample
    Install and instantiate FabCar sample of all the languages supported

    Scenario Outline: Clone the FabCar sample and package, install, instantiate it
        Given I have cloned the repository 'hyperledger/fabric-samples' and I have opened the '<language>' '<sampleName>' contract called '<contractName>' with namespace '<namespace>'
        And the Local Fabric is running
        And the 'Local Fabric Admin' identity
        And the 'Local Fabric' environment is connected
        And the contract has been packaged
        And I'm connected to the 'Local Fabric' gateway
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I submit the transaction 'createCar' with args '["123", "Tesla", "X", "Red", "Jack"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createCar'
        Examples:
        | language   | sampleName   | contractName               | namespace |
        | JavaScript | FabCarjs     | fabcar-contract-javascript | FabCar    |
        | TypeScript | FabCarts     | fabcar-contract-typescript | FabCar    |
        | Java       | FabCarJava   | fabcar-contract-java       | FabCar    |
        | Go         | FabCarGo     | fabcar-contract-go         | FabCar    |