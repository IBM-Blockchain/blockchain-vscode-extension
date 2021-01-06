Feature: Upgrade Smart Contracts
  Test upgrading a smart contract

  @otherFabric
  Scenario Outline: It should change the packaged contract
    Given an environment 'myFabric' exists
    And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    And the environment is setup
    And the 'myFabric' environment is connected
    And a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And a smart contract definition with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged as a tar.gz
    And the contract has been deployed on channel 'mychannel'
    And the contract has been deleted
    And the package has been deleted
    And a <language> smart contract for <assetType2> assets with the name <name> and version <version>
    And a smart contract definition with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged as a tar.gz
    When I deploy the contract on channel 'mychannel' with sequence '1'
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item mychannel
    And the tree item should have a tooltip equal to '<committedName>'
    And the log should have been called with 'SUCCESS' and 'Successfully approved smart contract definition'
    And the log should have been called with 'ERROR' and 'Failed to deploy smart contract, Could not commit smart contract definition'
    Examples:
      | language   | assetType | name               | assetType2 | version | committedName            |
      | JavaScript | Conga     | JavaScriptContract | CongaTwo   | 0.0.1   | JavaScriptContract@0.0.1 |
      | Java       | Conga     | JavaContract       | CongaTwo   | 0.0.1   | JavaContract@0.0.1       |

  @otherFabric
  Scenario Outline: It should update the definition
    Given an environment 'myFabric' exists
    And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    And the environment is setup
    And the 'myFabric' environment is connected
    And a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And a smart contract definition with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged as a tar.gz
    And the contract has been deployed on channel 'mychannel'
    And a smart contract definition with the name <name> and version <version2>
    When I deploy the contract on channel 'mychannel' with sequence '2'
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item mychannel
    And the tree item should have a tooltip equal to '<committedName>'
    And the log should have been called with 'SUCCESS' and 'Successfully committed smart contract definition'
    Examples:
      | language   | assetType | name               | version | version2 | committedName            |
      | JavaScript | Conga     | JavaScriptContract | 0.0.1   | 0.0.2    | JavaScriptContract@0.0.2 |
      | Java       | Conga     | JavaContract       | 0.0.1   | 0.0.2    | JavaContract@0.0.2       |

  Scenario Outline: It should upgrade a v1 smart contract
    Scenario Outline: Upgrade a smart contract
        Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
        And a local environment 'v1Fabric' with V1_4_2 capabilities exists
        And the 'v1Fabric' environment is connected
        And the contract has been created
        And the contract has been packaged as a cds
        And the contract has been installed and instantiated with the transaction '' and args '', not using private data on channel 'mychannel'
        And the contract version has been updated to '0.0.2'
        And the contract has been packaged as a cds
        When I upgrade the installed package with the transaction '' and args '', not using private data on channel 'mychannel'
        Then there should be an committed smart contract tree item with a label '<upgradedName>' in the 'Fabric Environments' panel for item mychannel
        And the tree item should have a tooltip equal to '<upgradedName>'
        Examples:
        | language   | assetType | name               | upgradedName              | version |
        | JavaScript | Conga     | JavaScriptContractV1 | JavaScriptContractV1@0.0.2  | 0.0.1   |
        | TypeScript | Conga     | TypeScriptContractV1 | TypeScriptContractV1@0.0.2  | 0.0.1   |
        | Java       | Conga     | JavaContractV1       | JavaContractV1@0.0.2        | 0.0.1   |
        | Go         | Conga     | GoContractV1         | GoContractV1@0.0.2          | 0.0.1   |
