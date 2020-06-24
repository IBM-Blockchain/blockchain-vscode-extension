@twoOrgFabric
Feature: FabCar Sample
    Install and instantiate FabCar sample of all the languages supported

    Scenario Outline: Clone the FabCar sample and package, install, instantiate it
        Given I have cloned the repository 'fabric-samples' and I have opened the '<language>' '<sampleName>' contract called '<contractName>' with namespace '<namespace>'
        And a 2 org local environment called '2 Org Network' has been created
        And the 2 Org Network environment is running
        And the 'Local Fabric Admin' identity
        And the '2 Org Network' environment is connected
        And the contract has been packaged
        And I'm connected to the '2 Org Network - Org1' gateway
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        When I submit the transaction 'createCar' on the channel 'mychannel' with args '["123", "Tesla", "X", "Red", "Jack"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createCar'
        Examples:
        | language   | sampleName   | contractName               | namespace |
        | JavaScript | FabCarjs     | fabcar-contract-javascript | FabCar    |
        | TypeScript | FabCarts     | fabcar-contract-typescript | FabCar    |
        | Java       | FabCarJava   | fabcar-contract-java       | FabCar    |
        | Go         | FabCarGo     | fabcar-contract-go         | FabCar    |
