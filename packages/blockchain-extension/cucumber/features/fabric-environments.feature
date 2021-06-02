Feature: Fabric Environments
  Tests all the features of the fabric ops panel

    Scenario Outline: There should be a tree item (disconnected)
        Given the 1 Org Local Fabric environment is running
        Then there should be a tree item with a label 'Simple local networks' in the 'Fabric Environments' panel
        And the 'Fabric Environments' tree item should have a child '<label>'
        And the tree item should have a tooltip equal to '<tooltip>'
        Examples:
        | label                     | tooltip                                  |
        | 1 Org Local Fabric  ●     | The local development runtime is running |

  # Scenario Outline: There should be a tree item (connected)
  #   Given the 1 Org Local Fabric environment is running
  #   And the '1 Org Local Fabric' environment is connected
  #   Then there should be a <treeItem> tree item with a label '<label>' in the 'Fabric Environments' panel
  #   And the tree item should have a tooltip equal to '<tooltip>'
  #   Examples:
  #     | treeItem              | label                                        | tooltip                                                                 |
  #     | environment connected | Connected to environment: 1 Org Local Fabric | Connected to environment: 1 Org Local Fabric                            |
  #     | channel               | mychannel                                    | Associated peers: Org1Peer1                                             |
  #     | Node                  | Org1Peer1                                    | Name: Org1Peer1\\nMSPID: Org1MSP\\nAssociated Identity:\\norg1Admin     |
  #     | Node                  | OrdererCA                                    | Name: OrdererCA\\nAssociated Identity:\\nadmin                          |
  #     | Node                  | Org1CA                                       | Name: Org1CA\\nAssociated Identity:\\nadmin                             |
  #     | Node                  | Orderer                                      | Name: Orderer\\nMSPID: OrdererMSP\\nAssociated Identity:\\nordererAdmin |
  #     | Organizations         | OrdererMSP                                   | OrdererMSP                                                              |
  #     | Organizations         | Org1MSP                                      | Org1MSP                                                                 |


  Scenario Outline: It should persist data after being stopped
    Given the 1 Org Local Fabric environment is running
    And the '1 Org Local Fabric' environment is connected
    And a <language> smart contract for <assetType> assets with the name <name> and version <version>
    And the contract has been created
    And the contract has been packaged as a tar.gz
    And the contract has been deployed on channel 'mychannel'
    When I stop the 1 Org Local Fabric
    Then there should be a tree item with a label 'Simple local networks' in the 'Fabric Environments' panel
    And the 'Fabric Environments' tree item should have a child '<label>'
    Then the tree item should have a tooltip equal to '<tooltip>'
    When I start the 1 Org Local Fabric
    And the '1 Org Local Fabric' environment is connected
    Then there should be a committed smart contract tree item with a label '<committedName>' in the 'Fabric Environments' panel for item mychannel
    Examples:
      | language   | assetType | name               | committedName            | version | label                                  | tooltip                                                                    |
      | JavaScript | Conga     | JavaScriptContract | JavaScriptContract@0.0.1 | 0.0.1   | 1 Org Local Fabric  ○ (click to start) | Creates a local development runtime using Hyperledger Fabric Docker images |

  @otherFabric
  Scenario: It should create an environment
    When I create an environment 'myFabric'
    Then there should be a tree item with a label 'Other networks' in the 'Fabric Environments' panel
    And the 'Fabric Environments' tree item should have a child 'myFabric'
    And the tree item should have a tooltip equal to 'myFabric'

  @opsToolsFabric
    Scenario: It should automatically add a discovered SaaS environment
      Given there are no IBM Cloud environments
      When I log in to IBM Cloud
      Then there should be a tree item with a label 'IBM Blockchain Platform on cloud' in the 'Fabric Environments' panel
      And the 'Fabric Environments' tree item should have a child 'VSCodeSaasOps'
      And the tree item should have a tooltip equal to 'VSCodeSaasOps'

  # @opsToolsFabric
  # Scenario Outline: It should create an environment without nodes
  #   When I create an environment '<environmentName>' of type '<environmentType>'
  #   And the wallet '<walletName>' with identity '<identtity>' and mspid '<mspid>' exists
  #   Then there should be a tree item with a label 'IBM Blockchain Platform on cloud' in the 'Fabric Environments' panel
  #   And the 'Fabric Environments' tree item should have a child '<environmentName>'
  #   And the tree item should have a tooltip equal to '<environmentName>'
  #   And there should be a tree item with a label 'Other/shared wallets' in the 'Fabric Wallets' panel
  #   And the 'Fabric Wallets' tree item should have a child '<walletName>'
  #   Examples:
  #     | environmentName      | environmentType    | walletName            | identtity         | mspid     |
  #     | myOpsToolsFabric     | software           | opsToolsWallet        | Org1_CA_Admin       | Org1MSP   |
  #     | mySaaSOpsToolsFabric | SaaS               | SaaSOpsToolsWallet    | Org1_CA_Saas_Admin  | Org1MSP   |

  @opsToolsFabric
  Scenario Outline: It should edit filters, add all nodes and connect automatically
    Given an environment '<environmentName>' of type '<environmentType>' exists
    When I edit filters and import all nodes to environment '<environmentName>'
    Then the '<environmentName>' environment is connected
    Examples:
      | environmentName      | environmentType |
      # | myOpsToolsFabric     | software        |
      | mySaaSOpsToolsFabric | SaaS            |

  @opsToolsFabric
  Scenario Outline: It should setup environment
    Given an environment '<environmentName>' of type '<environmentType>' exists
    And I have edited filters and imported all nodes to environment '<environmentName>'
    And the '<environmentName>' environment is connected
    Then there should be a tree item with a label '<label>' in the 'Fabric Environments' panel
    And the tree item should have a tooltip equal to '<tooltip>'
    Examples:
      | environmentName      | environmentType | label                              | tooltip                            |
      # | myOpsToolsFabric     | software        | Setting up: myOpsToolsFabric       | Setting up: myOpsToolsFabric       |
      # | myOpsToolsFabric     | software        | (Click each node to perform setup) | (Click each node to perform setup) |
      # | myOpsToolsFabric     | software        | Ordering Org CA   ⚠            | Ordering Org CA                |
      # | myOpsToolsFabric     | software        | Ordering Service   ⚠               | Ordering Service                   |
      # | myOpsToolsFabric     | software        | Org1 CA   ⚠                        | Org1 CA                            |
      # | myOpsToolsFabric     | software        | Org2 CA   ⚠                        | Org2 CA                            |
      # | myOpsToolsFabric     | software        | Org1 Peer   ⚠                      | Org1 Peer                          |
      # | myOpsToolsFabric     | software        | Org2 Peer   ⚠                      | Org2 Peer                          |
      | mySaaSOpsToolsFabric | SaaS            | Setting up: mySaaSOpsToolsFabric   | Setting up: mySaaSOpsToolsFabric   |
      | mySaaSOpsToolsFabric | SaaS            | (Click each node to perform setup) | (Click each node to perform setup) |
      | mySaaSOpsToolsFabric | SaaS            | Ordering Org Saas CA   ⚠            | Ordering Org Saas CA               |
      | mySaaSOpsToolsFabric | SaaS            | Ordering Service Saas   ⚠               | Ordering Service Saas                  |
      | mySaaSOpsToolsFabric | SaaS            | Org1 CA Saas   ⚠                        | Org1 CA Saas                           |
      | mySaaSOpsToolsFabric | SaaS            | Org2 CA Saas   ⚠                        | Org2 CA Saas                           |
      | mySaaSOpsToolsFabric | SaaS            | Org1 Peer Saas   ⚠                      | Org1 Peer Saas                         |
      | mySaaSOpsToolsFabric | SaaS            | Org2 Peer Saas   ⚠                      | Org2 Peer Saas                         |

  @opsToolsFabric
  Scenario Outline: It should associate nodes with identities
    Given an environment '<environmentName>' of type '<environmentType>' exists
    And I have edited filters and imported all nodes to environment '<environmentName>'
    And the '<environmentName>' environment is connected
    And the wallet '<wallet>' with identity '<existingIdentity>' and mspid '<existingMspid>' exists
    When I create an identity using JSON file with identity name '<identity>' and mspid '<mspid>' in wallet '<wallet>'
    And I associate identity '<identity>' in wallet '<wallet>' with node '<nodeName>'
    Then the log should have been called with 'SUCCESS' and 'Successfully added identity'
    Examples:
      | environmentName      | environmentType | nodeName            | wallet             | existingIdentity | existingMspid | identity                    | mspid   |
      # | myOpsToolsFabric     | software        | Ordering Org CA | opsToolsWallet     | Org1_CA_Admin      | Org1MSP       | Ordering_Org_CA_Admin      | OrdererMSP   |
      # | myOpsToolsFabric     | software        | Ordering Service_1 | opsToolsWallet     | Org1_CA_Admin      | Org1MSP       | Ordering_Org_Admin     | OrdererMSP   |
      # | myOpsToolsFabric     | software        | Org1 CA             | opsToolsWallet     | Org1_CA_Admin      | Org1MSP       | Org1_CA_Admin                 | Org1MSP |
      # | myOpsToolsFabric     | software        | Org2 CA             | opsToolsWallet     | Org1_CA_Admin      | Org1MSP       | Org2_CA_Admin                 | Org2MSP |
      # | myOpsToolsFabric     | software        | Org1 Peer           | opsToolsWallet     | Org1_CA_Admin      | Org1MSP       | Org1_Admin                | Org1MSP |
      # | myOpsToolsFabric     | software        | Org2 Peer           | opsToolsWallet     | Org1_CA_Admin      | Org1MSP       | Org2_Admin                | Org2MSP |
      | mySaaSOpsToolsFabric | SaaS            | Ordering Org Saas CA | SaaSOpsToolsWallet | Org1_CA_Saas_Admin  | Org1MSP       | Ordering_Org_Saas_CA_Admin  | OrdererMSP   |
      | mySaaSOpsToolsFabric | SaaS            | Ordering Service Saas_1  | SaaSOpsToolsWallet | Org1_CA_Saas_Admin  | Org1MSP       | Ordering_Org_Saas_Admin | OrdererMSP   |
      | mySaaSOpsToolsFabric | SaaS            | Org1 CA Saas             | SaaSOpsToolsWallet | Org1_CA_Saas_Admin  | Org1MSP       | Org1_CA_Saas_Admin            | Org1MSP |
      | mySaaSOpsToolsFabric | SaaS            | Org2 CA Saas             | SaaSOpsToolsWallet | Org2_CA_Saas_Admin  | Org2MSP       | Org2_CA_Saas_Admin            | Org2MSP |
      | mySaaSOpsToolsFabric | SaaS            | Org1 Peer Saas           | SaaSOpsToolsWallet | Org1_CA_Saas_Admin  | Org1MSP       | Org1Saas_Admin            | Org1MSP |
      | mySaaSOpsToolsFabric | SaaS            | Org2 Peer Saas           | SaaSOpsToolsWallet | Org2_CA_Saas_Admin  | Org2MSP       | Org2Saas_Admin            | Org2MSP |

  # @opsToolsFabric
  # Scenario Outline: It should connect to a software environment
  #   Given an environment 'myOpsToolsFabric' of type 'software' exists
  #   And the wallet 'opsToolsWallet' with identity 'Org1_CA_Admin' and mspid 'Org1MSP' exists
  #   And the wallet 'opsToolsWallet' with identity 'Org2_CA_Admin' and mspid 'Org2MSP' exists
  #   And the wallet 'opsToolsWallet' with identity 'Ordering_Org_CA_Admin' and mspid 'OrdererMSP' exists
  #   And the wallet 'opsToolsWallet' with identity 'Ordering_Org_Admin' and mspid 'OrdererMSP' exists
  #   And the wallet 'opsToolsWallet' with identity 'Org1_Admin' and mspid 'Org1MSP' exists
  #   And the wallet 'opsToolsWallet' with identity 'Org2_Admin' and mspid 'Org2MSP' exists
  #   And I have edited filters and imported all nodes to environment 'myOpsToolsFabric'
  #   And the 'software' opstools environment is setup
  #   And the 'myOpsToolsFabric' environment is connected
  #   Then there should be a <treeItem> tree item with a label '<label>' in the 'Fabric Environments' panel
  #   And the tree item should have a tooltip equal to '<tooltip>'
  #   Examples:
  #     | treeItem                    | label                                       | tooltip                                                                                |
  #     | environment connected       | Connected to environment: myOpsToolsFabric  | Connected to environment: myOpsToolsFabric                                             |
  #     | channel                    | mychannel1                                    | Associated peers: Org1 Peer, Org2 Peer\\nChannel capabilities: V2_0                    |
  #     | channel                    | mychannel2                                    | Associated peers: Org1 Peer, Org2 Peer\\nChannel capabilities: V1_4_2                    |
  #     | Node                        | Ordering Org CA                         | Name: Ordering Org CA\\nAssociated Identity:\\nOrdering_Org_CA_Admin              |
  #     | Node                        | Ordering Service                            | Name: Ordering Service\\nMSPID: OrdererMSP\\nAssociated Identity:\\nOrdering_Org_Admin |
  #     | Node                        | Org1 CA                                     | Name: Org1 CA\\nAssociated Identity:\\nOrg1_CA_Admin                                     |
  #     | Node                        | Org2 CA                                     | Name: Org2 CA\\nAssociated Identity:\\nOrg2_CA_Admin                                     |
  #     | Node                        | Org1 Peer                                   | Name: Org1 Peer\\nMSPID: Org1MSP\\nAssociated Identity:\\nOrg1_Admin                 |
  #     | Node                        | Org2 Peer                                   | Name: Org2 Peer\\nMSPID: Org2MSP\\nAssociated Identity:\\nOrg2_Admin                 |
  #     | Organizations               | OrdererMSP                                       | OrdererMSP                                                                                  |
  #     | Organizations               | Org1MSP                                     | Org1MSP                                                                                |
  #     | Organizations               | Org2MSP                                     | Org2MSP                                                                                |

  @opsToolsFabric
  Scenario Outline: It should connect to a SaaS environment
    Given an environment 'mySaaSOpsToolsFabric' of type 'SaaS' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1_CA_Saas_Admin' and mspid 'Org1MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering_Org_Saas_CA_Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering_Org_Saas_Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1Saas_Admin' and mspid 'Org1MSP' exists
    And I have edited filters and imported all nodes to environment 'mySaaSOpsToolsFabric'
    And the 'SaaS' opstools environment is setup
    And the 'mySaaSOpsToolsFabric' environment is connected
    Then there should be a <treeItem> tree item with a label '<label>' in the 'Fabric Environments' panel
    And the tree item should have a tooltip equal to '<tooltip>'
    Examples:
      | treeItem                    | label                                          | tooltip                                                                                    |
      | environment connected       | Connected to environment: mySaaSOpsToolsFabric | Connected to environment: mySaaSOpsToolsFabric                                             |
      | channel                    | mychannel1                                       | Associated peers: Org1 Peer Saas, Org2 Peer Saas\\nChannel capabilities: V2_0                                                                 |
      | channel                    | mychannel2                                       | Associated peers: Org1 Peer Saas, Org2 Peer Saas\\nChannel capabilities: V1_4_2                                                                 |
      | Node                        | Ordering Org Saas CA                            | Name: Ordering Org Saas CA\\nAssociated Identity:\\nOrdering_Org_Saas_CA_Admin              |
      | Node                        | Ordering Service Saas                              | Name: Ordering Service Saas\\nMSPID: OrdererMSP\\nAssociated Identity:\\nOrdering_Org_Saas_Admin |
      | Node                        | Org1 CA Saas                                        | Name: Org1 CA Saas\\nAssociated Identity:\\nOrg1_CA_Saas_Admin                                    |
      | Node                        | Org2 CA Saas                                        | Name: Org2 CA Saas\\nAssociated Identity:\\nOrg2_CA_Saas_Admin                                    |
      | Node                        | Org1 Peer Saas                                      | Name: Org1 Peer Saas\\nMSPID: Org1MSP\\nAssociated Identity:\\nOrg1Saas_Admin                 |
      | Node                        | Org2 Peer Saas                                      | Name: Org2 Peer Saas\\nMSPID: Org2MSP\\nAssociated Identity:\\nOrg2Saas_Admin                 |
      | Organizations               | OrdererMSP                                          | OrdererMSP                                                                                      |
      | Organizations               | Org1MSP                                        | Org1MSP                                                                                    |
      | Organizations               | Org2MSP                                        | Org2MSP                                                                                    |

  # @opsToolsFabric
  # Scenario: It should hide nodes on a software environment
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
  #   When I hide the node 'Org2 CA'
  #   Then there shouldn't be a tree item with a label 'Org2 CA' in the 'Fabric Environments' panel
  #   And the log should have been called with 'SUCCESS' and 'Successfully hid node Org2 CA'

  @opsToolsFabric
  Scenario: It should hide nodes on a SaaS environment
    Given an environment 'mySaaSOpsToolsFabric' of type 'SaaS' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1_CA_Saas_Admin' and mspid 'Org1MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org2_CA_Saas_Admin' and mspid 'Org2MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering_Org_Saas_CA_Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering_Org_Saas_Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1Saas_Admin' and mspid 'Org1MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org2Saas_Admin' and mspid 'Org2MSP' exists
    And I have edited filters and imported all nodes to environment 'mySaaSOpsToolsFabric'
    And the 'SaaS' opstools environment is setup
    And the 'mySaaSOpsToolsFabric' environment is connected
    When I hide the node 'Org1 CA Saas'
    Then there shouldn't be a tree item with a label 'Org1 CA Saas' in the 'Fabric Environments' panel
    And the log should have been called with 'SUCCESS' and 'Successfully hid node Org1 CA Saas'

  @otherFabric
  Scenario Outline: It should setup environment
    Given an environment 'myFabric' exists
    And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    When I connect to the environment 'myFabric'
    Then there should be a tree item with a label '<label>' in the 'Fabric Environments' panel
    And the tree item should have a tooltip equal to '<tooltip>'
    Examples:
      | label                              | tooltip                            |
      | Setting up: myFabric               | Setting up: myFabric               |
      | (Click each node to perform setup) | (Click each node to perform setup) |
      | ca.example.com   ⚠                 | ca.example.com                     |
      | orderer.example.com   ⚠            | orderer.example.com                |
      | peer0.org1.example.com   ⚠         | peer0.org1.example.com             |

  @otherFabric
  Scenario Outline: It should associate nodes with identities
    Given an environment 'myFabric' exists
    And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    And the 'myFabric' environment is connected
    When I associate identity '<identity>' in wallet '<wallet>' with node '<name>'
    Then the log should have been called with 'SUCCESS' and 'Successfully associated identity <identity> from wallet <wallet> with node <name>'
    Examples:
      | name                   | wallet   | identity |
      | peer0.org1.example.com | myWallet | conga    |
      | orderer.example.com    | myWallet | conga    |
      | ca.example.com         | myWallet | conga2   |

  @otherFabric
  Scenario Outline: It should connect to an environment
    Given an environment 'myFabric' exists
    And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
    And the environment is setup
    When I connect to the environment 'myFabric'
    Then there should be a <treeItem> tree item with a label '<label>' in the 'Fabric Environments' panel
    And the tree item should have a tooltip equal to '<tooltip>'
    Examples:
      | treeItem              | label                              | tooltip                                                                      |
      | environment connected | Connected to environment: myFabric | Connected to environment: myFabric                                           |
      | channel               | mychannel                          | Associated peers: peer0.org1.example.com\\nChannel capabilities: V2_0                                      |
      | Node                  | peer0.org1.example.com             | Name: peer0.org1.example.com\\nMSPID: Org1MSP\\nAssociated Identity:\\nconga |
      | Node                  | ca.example.com                     | Name: ca.example.com\\nAssociated Identity:\\nconga2                         |
      | Node                  | orderer.example.com                | Name: orderer.example.com\\nMSPID: OrdererMSP\\nAssociated Identity:\\nconga |
      | Organizations         | OrdererMSP                         | OrdererMSP                                                                   |
      | Organizations         | Org1MSP                            | Org1MSP                                                                      |

  @otherFabric
  Scenario: It should delete a node
      Given an environment 'myFabric2' exists
      And the wallet 'myWallet2' with identity 'conga' and mspid 'Org1MSP' exists
      And the environment is setup
      And the 'myFabric2' environment is connected
      When I delete node 'ca.example.com'
      Then there shouldn't be a Node tree item with a label 'ca.example.com' in the 'Fabric Environments' panel
      And there should be a Node tree item with a label 'peer0.org1.example.com' in the 'Fabric Environments' panel

  @otherFabric
  Scenario: It should delete an environment
    Given an environment 'myFabric2' exists
    When I delete an environment 'myFabric2'
    Then there shouldn't be a tree item with a label 'myFabric2' in the 'Fabric Environments' panel
