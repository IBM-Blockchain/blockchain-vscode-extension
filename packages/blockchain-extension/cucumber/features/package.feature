Feature: Packaged Smart Contracts
    Test a smart contract can be packaged in all the languages supported

    # Scenario Outline: Package a smart contract
    #     Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    #     And the contract has been created
    #     When I package the contract
    #     Then a new package should be created with the name <name> and version <version>
    #     And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
    #     And the tree item should have a tooltip equal to '<packagedName>'
    #     Examples:
    #     | language   | assetType | name               | packagedName             | version |
    #     | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |
    #     | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.1 | 0.0.1   |
    #     | Java       | Conga     | JavaContract       | JavaContract@0.0.1       | 0.0.1   |
    #     | Go         | null      | GoContract         | GoContract@0.0.1         | 0.0.1   |

