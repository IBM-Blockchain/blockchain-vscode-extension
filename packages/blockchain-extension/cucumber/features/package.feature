Feature: Smart Contracts packages
    Test a smart contract can be packaged in all the languages supported, and it's contents inspected with View package Information

    Scenario Outline: Package a smart contract as a targz
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        When I package the contract as a tar.gz
        Then a new package should be created with the name <name> and version <version>
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        And the tree item should have a tooltip including to '<packagedName> (<extension>)\nFile size:'
        And the file size should be greater than '<size>' KB
        Examples:
        | language   | assetType | name               | packagedName             | size     | version | extension |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 36       | 0.0.1   | .tar.gz   |
        | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.1 | 36       | 0.0.1   | .tar.gz   |
        | Java       | Conga     | JavaContract       | JavaContract@0.0.1       | 55       | 0.0.1   | .tar.gz   |
        | Go         | Conga     | GoContract         | GoContract@0.0.1         | 2414     | 0.0.1   | .tar.gz   |

    Scenario Outline: Inspect smart contract contents for a targz contract
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged as a tar.gz
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
        | language   | assetType | name               | packagedName             | version |
        | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |

    Scenario Outline: Package a smart contract as a cds
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        When I package the contract as a cds
        Then a new package should be created with the name <name> and version <version>
        And there should be a tree item with a label '<packagedName>' in the 'Smart Contracts' panel
        And the tree item should have a tooltip equal to '<packagedName> (<extension>)\nFile size: <size> KB'
        Examples:
        | language   | assetType | name                 | packagedName               | size     | version | extension |
        | JavaScript | Conga     | JavaScriptContractV1 | JavaScriptContractV1@0.0.1 | 36       | 0.0.1   | .cds      |
        | TypeScript | Conga     | TypeScriptContractV1 | TypeScriptContractV1@0.0.1 | 36       | 0.0.1   | .cds      |
        | Java       | Conga     | JavaContractV1       | JavaContractV1@0.0.1       | 55       | 0.0.1   | .cds      |

    Scenario: Do not package go contract as cds from outside gopath
        Given a Go smart contract for Conga assets with the name GoContractV1 and version 0.0.1
        And the contract has been created
        When I package the contract as a cds
        Then no package should be created with the name GoContractV1 and version 0.0.1

    Scenario Outline: Inspect smart contract contents for a cds contract
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And the contract has been created
        And the contract has been packaged as a cds
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
        | language   | assetType | name                 | packagedName               | version |
        | JavaScript | Conga     | JavaScriptContractV1 | JavaScriptContractV1@0.0.1 | 0.0.1   |
