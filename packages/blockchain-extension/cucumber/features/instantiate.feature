Feature: Instantiate Smart Contracts
    Instantiate a smart contract of all the languages supported

    Scenario Outline: Instantiate a smart contract
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the Local Fabric is running
        And the 'Local Fabric' environment is connected
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        When I instantiate the installed package with the transaction '' and args '', not using private data on channel 'mychannel'
        Then there should be an instantiated smart contract tree item with a label '<instantiatedName>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'
        Examples:
        | language   | assetType | name               | instantiatedName          | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1  | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.1  | 0.0.1   |
        | Java       | Conga     | JavaContract       | JavaContract@0.0.1        | 0.0.1   |
        | Go         | null      | GoContract         | GoContract@0.0.1          | 0.0.1   |

    @ansibleFabric
    Scenario Outline: Instantiate a private smart contract
        Given a private <language> smart contract for <assetType> assets with the name <name> and version <version> and mspid <mspid>
        Given an environment 'myAnsibleFabric' exists
        And the 'myAnsibleFabric' environment is connected
        And the private contract has been created
        And the contract has been packaged
        And the package has been installed
        When I instantiate the installed package with the transaction '' and args '', using private data on channel 'channel1'
        Then there should be an instantiated smart contract tree item with a label '<instantiatedName>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'Instantiated on: channel1'
        Examples:
        | language   | assetType        | name                      | instantiatedName                 | mspid      | version |
        | JavaScript | PrivateConga     | PrivateJavaScriptContract | PrivateJavaScriptContract@0.0.1  | Org1MSP    | 0.0.1   |
        | TypeScript | PrivateConga     | PrivateTypeScriptContract | PrivateTypeScriptContract@0.0.1  | Org1MSP    | 0.0.1   |
        | Java       | PrivateConga     | PrivateJavaContract       | PrivateJavaContract@0.0.1        | Org1MSP    | 0.0.1   |
