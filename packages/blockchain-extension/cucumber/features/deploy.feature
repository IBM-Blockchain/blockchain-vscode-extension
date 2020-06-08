Feature: Deploy Smart Contracts
  Deploy a smart contract of all the languages supported

  Scenario Outline: Deploy a smart contract
    Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the 1 Org Local Fabric environment is running
    And the '1 Org Local Fabric' environment is connected
    And a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And a smart contract definition with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged
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
    And the contract has been packaged
    When I deploy the contract on channel 'mychannel' with sequence '1'
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item mychannel
    And the tree item should have a tooltip equal to '<committedName>'
    Examples:
      | language   | assetType | name               | committedName            | version |
      | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   |

  @ansibleFabric
  Scenario Outline: Deploy a private smart contract
    Given a private <language> smart contract for <assetType> assets with the name <name> and version <version> and mspid <mspid>
    Given an environment 'myAnsibleFabric' exists
    And the 'myAnsibleFabric' environment is connected
    And the private contract has been created
    And the contract has been packaged
    When I deploy the contract on channel 'channel1' with sequence '1' with private data
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item channel1
    And the tree item should have a tooltip equal to '<committedName>'
    Examples:
      | language   | assetType    | name                      | committedName                   | mspid   | version |
      | JavaScript | PrivateConga | PrivateJavaScriptContract | PrivateJavaScriptContract@0.0.1 | Org1MSP | 0.0.1   |
      | TypeScript | PrivateConga | PrivateTypeScriptContract | PrivateTypeScriptContract@0.0.1 | Org1MSP | 0.0.1   |
      | Java       | PrivateConga | PrivateJavaContract       | PrivateJavaContract@0.0.1       | Org1MSP | 0.0.1   |
