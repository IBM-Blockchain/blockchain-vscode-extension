Feature: Smart Contracts packages
    Test a smart contract can be packaged in all the languages supported, and it's contents inspected with View package Information

    Scenario Outline: Package a smart contract
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        When I package the contract
        Then a new package should be created with the name <name> and version <version>
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        And the tree item should have a tooltip equal to '<packagedName>\nFile size: <size> KB'
        Examples:
        | language   | assetType | name               | packagedName             | size     | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 52       | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.1 | 49       | 0.0.1   |
        | Java       | Conga     | JavaContract       | JavaContract@0.0.1       | 56       | 0.0.1   |
        | Go         | null      | GoContract         | GoContract@0.0.1         | 3672     | 0.0.1   |

    Scenario Outline: Inspect smart contract contents
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        When I run the command View package Information for package with name <name> and version <version>
        Then the logger should have been called with 'INFO', 'undefined' and 'Found 5 file(s) in smart contract package JavaScriptContract@0.0.1:'
        And the logger should have been called with 'INFO', 'undefined' and '- src/index.js'
        And the logger should have been called with 'INFO', 'undefined' and '- src/lib/conga-contract.js'
        And the logger should have been called with 'INFO', 'undefined' and '- src/package-lock.json'
        And the logger should have been called with 'INFO', 'undefined' and '- src/package.json'
        And the logger should have been called with 'INFO', 'undefined' and '- src/transaction_data/conga-transactions.txdata'
        And the log should have been called with 'SUCCESS' and 'Displayed information for smart contract package JavaScriptContract@0.0.1.'
        Examples:
        | language   | assetType | name               | packagedName             | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |
