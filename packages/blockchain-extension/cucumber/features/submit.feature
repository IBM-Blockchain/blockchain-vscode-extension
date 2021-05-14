Feature: Submit transaction
  Test submitting a transaction

  Scenario Outline: Submit a transaction for a smart contract (local fabric)
    Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the 1 Org Local Fabric environment is running
    And the '1 Org Local Fabric' environment is connected
    And the 'Org1' wallet
    And the 'Local Fabric Admin' identity
    And I'm connected to the '1 Org Local Fabric - Org1 Gateway' gateway
    And the contract has been created
    And the contract has been packaged as a tar.gz
    And the contract has been deployed on channel 'mychannel'
    When I submit the transaction 'createConga' on the channel 'mychannel' with args '["Conga_001", "Big Conga"]'
    Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createConga'
    Examples:
      | language   | assetType | name               | version |
      | JavaScript | Conga     | JavaScriptContract | 0.0.1   |
      | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
      | Java       | Conga     | JavaContract       | 0.0.1   |
      | Go         | Conga     | GoContract         | 0.0.1   |


  Scenario Outline: Submit a transaction for a smart contract using generated transaction data
    Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the 1 Org Local Fabric environment is running
    And the '1 Org Local Fabric' environment is connected
    And the 'Org1' wallet
    And the 'Local Fabric Admin' identity
    And I'm connected to the '1 Org Local Fabric - Org1 Gateway' gateway
    And the contract has been created
    And the contract has been packaged as a tar.gz
    And the contract has been deployed on channel 'mychannel'
    And the contract has been associated with a directory of transaction data
    When I submit the transaction 'createConga' on the channel 'mychannel' using the transaction data labelled 'A test createConga transaction'
    Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createConga'
    Examples:
      | language   | assetType | name               | version |
      | TypeScript | Conga     | TypeScriptContract | 0.0.1   |

  Scenario Outline: Submit a verify transaction for a private data smart contract
    Given a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the 1 Org Local Fabric environment is running
    And the '1 Org Local Fabric' environment is connected
    And the 'Org1' wallet
    And the 'Local Fabric Admin' identity
    And I'm connected to the '1 Org Local Fabric - Org1 Gateway' gateway
    And the contract has been created
    And the contract has been packaged as a tar.gz
    When I deploy the contract on channel 'mychannel' with sequence '2' with private data
    When I submit the transaction 'createPrivateConga' on the channel 'mychannel' with args '["001"]' and with the transient data '{"privateValue":"125"}'
    Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createPrivateConga'
    When I submit the transaction 'verifyPrivateConga' on the channel 'mychannel' with args '["Org1MSP", "001", "{\"privateValue\":\"125\"}"]'
    Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'Returned value from verifyPrivateConga: true'
    Examples:
      | language   | assetType    | name                      | version |
      | JavaScript | PrivateConga | PrivateJavaScriptContract | 0.0.1   |
      | TypeScript | PrivateConga | PrivateTypeScriptContract | 0.0.1   |
      | Java       | PrivateConga | PrivateJavaContract       | 0.0.1   |
      | Go         | PrivateConga | PrivateGoContract         | 0.0.1   |


  @otherFabric
  Scenario Outline: Submit a transaction for a smart contract (other fabric)
    Given an environment 'myFabric' exists
    And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    And the environment is setup
    And the 'myFabric' environment is connected
    And a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged as a tar.gz
    And the contract has been deployed on channel 'mychannel'
    And the gateway 'myGateway' is created
    And I'm connected to the 'myGateway' gateway without association
    When I submit the transaction 'createCongaTwo' on the channel 'mychannel' with args '["Conga_001", "Big Conga"]'
    Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'No value returned from createCongaTwo'
    Examples:
      | language   | assetType | name               | version |
      | JavaScript | CongaTwo  | JavaScriptContract | 0.0.1   |
      | Java       | CongaTwo  | JavaContract       | 0.0.1   |

# @opsToolsFabric
# Scenario Outline: Submit a transaction for a smart contract (OpsTool software environment)
#   Given an environment 'myOpsToolsFabric' of type 'software' exists
#   And the wallet 'opsToolsWallet' with identity 'Org1_CA_Admin' and mspid 'Org1MSP' exists
#   And the wallet 'opsToolsWallet' with identity 'Org2_CA_Admin' and mspid 'Org2MSP' exists
#   And the wallet 'opsToolsWallet' with identity 'Ordering_Org_CA_Admin' and mspid 'OrdererMSP' exists
#   And the wallet 'opsToolsWallet' with identity 'Ordering_Org_Admin' and mspid 'OrdererMSP' exists
#   And the wallet 'opsToolsWallet' with identity 'Ordering_Org_Admin' and mspid 'OrdererMSP' exists
#   And the wallet 'opsToolsWallet' with identity 'Org1_Admin' and mspid 'Org1MSP' exists
#   And the wallet 'opsToolsWallet' with identity 'Org2_Admin' and mspid 'Org2MSP' exists
#   And I have edited filters and imported all nodes to environment 'myOpsToolsFabric'
#   And the 'software' opstools environment is setup
#   And the 'myOpsToolsFabric' environment is connected
#   And a <language> smart contract for <assetType> assets with the name <name> and version <version>
#   And the contract has been created
#   And the contract has been packaged as a tar.gz
#   And the contract has been deployed on channel 'mychannel1'
#   And I have created a gateway 'myOpsGateway' from an 'environment' with an msp "Org1MSP" and CA name "Org1 CA"
#   And the 'opsToolsWallet' wallet
#   And the 'Org1_Admin' identity
#   And I'm connected to the 'myOpsGateway' gateway
#   And the transaction 'createConga' has been submitted on the channel 'mychannel1' with args '["001", "newAsset"]'
#   When I submit the transaction 'readConga' on the channel 'mychannel1' with args '["001"]'
#   Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'Returned value from readConga: {"value":"newAsset"}'
#   Examples:
#     | language   | assetType | name               | version |
#     | TypeScript | Conga     | TypeScriptContract | 0.0.1   |

# @opsToolsFabric
# Scenario Outline: Submit a transaction for a smart contract (OpsTool SaaS environment)
#   Given an environment 'mySaaSOpsToolsFabric' of type 'SaaS' exists
#   And the wallet 'SaaSOpsToolsWallet' with identity 'Org1_CA_Saas_Admin' and mspid 'Org1MSP' exists
#   And the wallet 'SaaSOpsToolsWallet' with identity 'Org2_CA_Saas_Admin' and mspid 'Org1MSP' exists
#   And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering_Org_Saas_CA_Admin' and mspid 'OrdererMSP' exists
#   And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering_Org_Saas_Admin' and mspid 'OrdererMSP' exists
#   And the wallet 'SaaSOpsToolsWallet' with identity 'Org1Saas_Admin' and mspid 'Org1MSP' exists
#   And the wallet 'SaaSOpsToolsWallet' with identity 'Org2Saas_Admin' and mspid 'Org2MSP' exists
#   And I have edited filters and imported all nodes to environment 'mySaaSOpsToolsFabric'
#   And the 'SaaS' opstools environment is setup
#   And the 'mySaaSOpsToolsFabric' environment is connected
#   And a <language> smart contract for <assetType> assets with the name <name> and version <version>
#   And the contract has been created
#   And the contract has been packaged as a tar.gz
#   And the contract has been deployed on channel 'mychannel1'
#   And I have created a gateway 'mySaaSOpsGateway' from an 'environment'
#   And the 'SaaSOpsToolsWallet' wallet
#   And the 'Org1Saas_Admin' identity
#   And I'm connected to the 'mySaaSOpsGateway' gateway
#   And the transaction 'createConga' has been submitted on the channel 'mychannel1' with args '["001", "newAsset"]'
#   When I submit the transaction 'readConga' on the channel 'mychannel1' with args '["001"]'
#   Then the logger should have been called with 'SUCCESS', 'Successfully submitted transaction' and 'Returned value from readConga: {"value":"newAsset"}'
#   Examples:
#     | language   | assetType | name               | version |
#     | TypeScript | Conga     | TypeScriptContract | 0.0.1   |
