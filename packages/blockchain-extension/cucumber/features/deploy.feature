Feature: Deploy Smart Contracts
  Deploy a smart contract of all the languages supported

  Scenario Outline: Deploy a smart contract
    Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the 1 Org Local Fabric environment is running
    And the '1 Org Local Fabric' environment is connected
    And a smart contract definition with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged as a tar.gz
    When I deploy the contract on channel 'mychannel' with sequence '1'
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item mychannel
    And the tree item should have a tooltip equal to '<committedName>'
    Examples:
      | language   | assetType | name               | committedName            | version |
      | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |
      | TypeScript | Conga     | TypeScriptContract | TypeScriptContract@0.0.1 | 0.0.1   |
      | Java       | Conga     | JavaContract       | JavaContract@0.0.1       | 0.0.1   |
      | Go         | Conga     | GoContract         | GoContract@0.0.1         | 0.0.1   |

  @otherFabric
  Scenario Outline: It should deploy a smart contract
    Given an environment 'myFabric' exists
    And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    And the environment is setup
    And the 'myFabric' environment is connected
    And a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And a smart contract definition with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged as a tar.gz
    When I deploy the contract on channel 'mychannel' with sequence '1'
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item mychannel
    And the tree item should have a tooltip equal to '<committedName>'
    Examples:
      | language   | assetType | name               | committedName            | version |
      | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |

  Scenario Outline: Deploy a private smart contract
    Given a private <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the 1 Org Local Fabric environment is running
    And the '1 Org Local Fabric' environment is connected
    And the private contract has been created
    And the contract has been packaged as a tar.gz
    When I deploy the contract on channel 'mychannel' with sequence '1'
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item mychannel
    And the tree item should have a tooltip equal to '<committedName>'
    Examples:
      | language   | assetType    | name                      | committedName                   | version |
      | JavaScript | PrivateConga | PrivateJavaScriptContract | PrivateJavaScriptContract@0.0.1 | 0.0.1   |
      | TypeScript | PrivateConga | PrivateTypeScriptContract | PrivateTypeScriptContract@0.0.1 | 0.0.1   |
      | Java       | PrivateConga | PrivateJavaContract       | PrivateJavaContract@0.0.1       | 0.0.1   |

  Scenario Outline: Install and instantiate a v1 smart contract
          Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
          And a local environment 'v1Fabric' with V1_4_2 capabilities exists
          And the 'v1Fabric' environment is connected
          And the contract has been created
          And the contract has been packaged as a cds
          When I install and instantiate the package with the transaction '' and args '', not using private data on channel 'mychannel'
          Then there should be an committed smart contract tree item with a label '<instantiatedName>' in the 'Fabric Environments' panel for item mychannel
          And the tree item should have a tooltip equal to '<instantiatedName>'
          Examples:
          | language   | assetType | name               | instantiatedName          | version |
          | JavaScript | Conga     | JavaScriptContractV1 | JavaScriptContractV1@0.0.1  | 0.0.1   |
          | TypeScript | Conga     | TypeScriptContractV1 | TypeScriptContractV1@0.0.1  | 0.0.1   |
          | Java       | Conga     | JavaContractV1       | JavaContractV1@0.0.1        | 0.0.1   |
          | Go         | Conga     | GoContractV1         | GoContractV1@0.0.1          | 0.0.1   |