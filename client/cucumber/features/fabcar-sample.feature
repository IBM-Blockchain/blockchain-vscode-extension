Feature: FabCar Sample
    Install and instantiate FabCar sample of all the languages supported

    Scenario Outline: Clone the FabCar sample and package, install, instantiate it
        # Given I have cloned a <language> FabCar sample for <assetType> assets with the name <name> and version <version>
        Given I have cloned the repository 'hyperledger/fabric-samples' and I have opened the '<language>' '<sampleName>' contract called '<contractName>'
        And the Local Fabric is running
        And the contract has been packaged
        And I'm connected to the 'Local Fabric' gateway
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data
        When I submit the transaction 'createCar' with args '["123", "Tesla", "X", "Red", "Jack"]'
        Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createCar'
        Examples:
        | language   | sampleName | contractName               |
        | JavaScript | FabCar     | fabcar-contract-javascript |
        | TypeScript | FabCar     | fabcar-contract-typescript |
        | Java       | FabCar     | fabcar-contract-java       | 
        | Go         | FabCar     | fabcar-contract-go         |