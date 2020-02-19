Feature: Install Smart Contract
    Test installing a smart contract of all the languages supported

    Scenario Outline: Install a smart contract
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the Local Fabric is running
        And the 'Local Fabric' environment is connected
        And the contract has been created
        And the contract has been packaged
        When I install the package
        Then there should be a installed smart contract tree item with a label '<installedName>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'Installed on: Org1Peer1'
        Examples:
        | language   | assetType | name               | installedName            | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.1 | 0.0.1   |
        | Java       | Conga     | JavaContract       | JavaContract@0.0.1       | 0.0.1   |
        | Go         | null      | GoContract         | GoContract@0.0.1         | 0.0.1   |


    @ansibleFabric
    Scenario Outline: Install a smart contract
        Given a private <language> smart contract for <assetType> assets with the name <name> and version <version> and mspid <mspid>
        Given an environment 'myAnsibleFabric' exists
        And the 'myAnsibleFabric' environment is connected
        And the private contract has been created
        And the contract has been packaged
        When I install the package
        Then there should be a installed smart contract tree item with a label '<installedName>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'Installed on: Org1Peer1, Org1Peer2, Org2Peer1, Org2Peer2'
        Examples:
        | language   | assetType        | name                      | installedName                    | version |
        | JavaScript | PrivateConga     | PrivateJavaScriptContract | PrivateJavaScriptContract@0.0.1  | 0.0.1   |
        | TypeScript | PrivateConga     | PrivateTypeScriptContract | PrivateTypeScriptContract@0.0.1  | 0.0.1   |
        | Java       | PrivateConga     | PrivateJavaContract       | PrivateJavaContract@0.0.1        | 0.0.1   |
