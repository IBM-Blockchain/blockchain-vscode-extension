Feature: Smart Contracts packages
    Test a smart contract can be packaged in all the languages supported, and it's contents inspected with View package Information

    Scenario Outline: Package a smart contract using Fabric v2
        Given a <language> smart contract using Fabric v2 for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        When I package the contract
        Then a new package should be created with the name <name> and version <version>
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        And the tree item should have a tooltip equal to '<packagedName>\nFile size: <size> KB'
        Examples:
        | language   | assetType | name               | packagedName                    | size     | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1.tar.gz | 39       | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.1.tar.gz | 37       | 0.0.1   |
        | Java       | Conga     | JavaContract       | JavaContract@0.0.1.tar.gz       | 55       | 0.0.1   |
        | Go         | Conga     | GoContract         | GoContract@0.0.1.tar.gz         | 2418     | 0.0.1   |

    Scenario Outline: Inspect smart contract contents for a v2 contract
        Given a <language> smart contract using Fabric v2 for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        When I run the command View package Information for package with name <name> and version <version>
        Then the logger should have been called with 'INFO', 'undefined' and 'Found 6 file(s) in smart contract package JavaScriptContract@0.0.1:'
        And the logger should have been called with 'INFO', 'undefined' and '- metadata.json'
        And the logger should have been called with 'INFO', 'undefined' and '- src/index.js'
        And the logger should have been called with 'INFO', 'undefined' and '- src/lib/conga-contract.js'
        And the logger should have been called with 'INFO', 'undefined' and '- src/package-lock.json'
        And the logger should have been called with 'INFO', 'undefined' and '- src/package.json'
        And the logger should have been called with 'INFO', 'undefined' and '- src/transaction_data/conga-transactions.txdata'
        And the log should have been called with 'SUCCESS' and 'Displayed information for smart contract package JavaScriptContract@0.0.1.'
        Examples:
        | language   | assetType | name               | packagedName                    | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1.tar.gz | 0.0.1   |

    Scenario Outline: Package a smart contract using Fabric v1
        Given a <language> smart contract using Fabric v1 for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        When I package the contract
        Then a new package should be created with the name <name> and version <version>
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        And the tree item should have a tooltip equal to '<packagedName>\nFile size: <size> KB'
        Examples:
        | language   | assetType | name                 | packagedName                   | size     | version |
        | JavaScript | Conga     | JavaScriptContractV1 | JavaScriptContractV1@0.0.1.cds | 52       | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContractV1 | TypeScriptContractV1@0.0.1.cds | 49       | 0.0.1   |
        | Java       | Conga     | JavaContractV1       | JavaContractV1@0.0.1.cds       | 56       | 0.0.1   |
        | Go         | Conga     | GoContractV1         | GoContractV1@0.0.1.cds         | 2284     | 0.0.1   |

    Scenario Outline: Inspect smart contract contents for a v1 contract
        Given a <language> smart contract using Fabric v1 for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        When I run the command View package Information for package with name <name> and version <version>
        Then the logger should have been called with 'INFO', 'undefined' and 'Found 5 file(s) in smart contract package JavaScriptContractV1@0.0.1:'
        And the logger should have been called with 'INFO', 'undefined' and '- src/index.js'
        And the logger should have been called with 'INFO', 'undefined' and '- src/lib/conga-contract.js'
        And the logger should have been called with 'INFO', 'undefined' and '- src/package-lock.json'
        And the logger should have been called with 'INFO', 'undefined' and '- src/package.json'
        And the logger should have been called with 'INFO', 'undefined' and '- src/transaction_data/conga-transactions.txdata'
        And the log should have been called with 'SUCCESS' and 'Displayed information for smart contract package JavaScriptContractV1@0.0.1.'
        Examples:
        | language   | assetType | name                 | packagedName                   | version |
        | JavaScript | Conga     | JavaScriptContractV1 | JavaScriptContractV1@0.0.1.cds | 0.0.1   |
