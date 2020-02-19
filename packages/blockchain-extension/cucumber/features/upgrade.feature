Feature: Upgrade Smart Contracts
    Test upgrading a smart contract for all the languages supported

    Scenario Outline: Upgrade a smart contract
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the Local Fabric is running
        And the '1 Org Local Fabric' environment is connected
        And the contract has been created
        And the contract has been packaged
        And the package has been installed
        And the contract has been instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        And the contract version has been updated to '0.0.2'
        And the contract has been packaged
        And the package has been installed
        When I upgrade the installed package with the transaction '' and args '', not using private data on channel 'mychannel'
        Then there should be an instantiated smart contract tree item with a label '<upgradedName>' in the 'Fabric Environments' panel
        And the tree item should have a tooltip equal to 'Instantiated on: mychannel'
        Examples:
        | language   | assetType | name               | upgradedName              | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.2  | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.2  | 0.0.1   |
        | Java       | Conga     | JavaContract       | JavaContract@0.0.2        | 0.0.1   |
        | Go         | null      | GoContract         | GoContract@0.0.2          | 0.0.1   |
