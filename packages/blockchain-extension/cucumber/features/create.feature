Feature: Created Smart Contracts
    Create a smart contract for each of the languages supported

    # Scenario Outline: Create a smart contract
    #     Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    #     And the contract hasn't been created already
    #     When I create the contract
    #     Then a new contract directory should exist
    #     Examples:
    #     | language   | assetType | name               | version |
    #     | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
    #     | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
    #     | Java       | Conga     | JavaContract       | 0.0.1   |
    #     | Go         | null      | GoContract         | 0.0.1   |
