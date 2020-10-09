Feature: Created Smart Contracts
    Create a smart contract for each of the languages supported

    Scenario Outline: Create a v2 smart contract
        Given a <language> smart contract using Fabric v2 for <assetType> assets with the name <name> and version <version>
        And the contract hasn't been created already
        When I create the contract
        Then a new contract directory should exist
        Examples:
        | language   | assetType | name               | version |
        | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
        | Java       | Conga     | JavaContract       | 0.0.1   |
        | Go         | Conga     | GoContract         | 0.0.1   |

    Scenario Outline: Create a v1 smart contract
        Given a <language> smart contract using Fabric v1 for <assetType> assets with the name <name> and version <version>
        And the contract hasn't been created already
        When I create the contract
        Then a new contract directory should exist
        Examples:
        | language   | assetType | name                 | version |
        | JavaScript | Conga     | v1JavaScriptContract | 0.0.1   |
        | TypeScript | Conga     | v1TypeScriptContract | 0.0.1   |
        | Java       | Conga     | v1JavaContract       | 0.0.1   |
        | Go         | Conga     | v1GoContract         | 0.0.1   |


    @ansibleFabric
    Scenario Outline: Create a v2 private data smart contract
        Given a private <language> smart contract using Fabric v2 for <assetType> assets with the name <name> and version <version> and mspid <mspid>
        And the contract hasn't been created already
        When I create the private contract
        Then a new contract directory should exist
        Examples:
        | language   | assetType        | name                      | mspid      | version |
        | JavaScript | PrivateConga     | PrivateJavaScriptContract | Org1MSP    | 0.0.1   |
        | TypeScript | PrivateConga     | PrivateTypeScriptContract | Org1MSP    | 0.0.1   |
        | Java       | PrivateConga     | PrivateJavaContract       | Org1MSP    | 0.0.1   |

    @ansibleFabric
    Scenario Outline: Create a v1 private data smart contract
        Given a private <language> smart contract using Fabric v1 for <assetType> assets with the name <name> and version <version> and mspid <mspid>
        And the contract hasn't been created already
        When I create the private contract
        Then a new contract directory should exist
        Examples:
        | language   | assetType        | name                        | mspid      | version |
        | JavaScript | PrivateConga     | v1PrivateJavaScriptContract | Org1MSP    | 0.0.1   |
        | TypeScript | PrivateConga     | v1PrivateTypeScriptContract | Org1MSP    | 0.0.1   |
        | Java       | PrivateConga     | v1PrivateJavaContract       | Org1MSP    | 0.0.1   |
