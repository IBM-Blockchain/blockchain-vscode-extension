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

  @opsToolsFabric
  Scenario Outline: It should edit filters, add all nodes and connect automatically
    Given an environment '<environmentName>' of type '<environmentType>' exists
    When I edit filters and import all nodes to environment '<environmentName>'
    Then the '<environmentName>' environment is connected
    Examples:
      | environmentName      | environmentType |
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
      | mySaaSOpsToolsFabric | SaaS            | Ordering Org Saas CA | SaaSOpsToolsWallet | Org1 CA Saas Admin  | Org1MSP       | Ordering Org Saas CA Admin  | OrdererMSP   |
      | mySaaSOpsToolsFabric | SaaS            | Ordering Service Saas_1  | SaaSOpsToolsWallet | Org1 CA Saas Admin  | Org1MSP       | Ordering Org Saas Admin | OrdererMSP   |
      | mySaaSOpsToolsFabric | SaaS            | Org1 CA Saas             | SaaSOpsToolsWallet | Org1 CA Saas Admin  | Org1MSP       | Org1 CA Saas Admin            | Org1MSP |
      | mySaaSOpsToolsFabric | SaaS            | Org2 CA Saas             | SaaSOpsToolsWallet | Org2 CA Saas Admin  | Org2MSP       | Org2 CA Saas Admin            | Org2MSP |
      | mySaaSOpsToolsFabric | SaaS            | Org1 Peer Saas           | SaaSOpsToolsWallet | Org1 CA Saas Admin  | Org1MSP       | Org1Saas Admin            | Org1MSP |
      | mySaaSOpsToolsFabric | SaaS            | Org2 Peer Saas           | SaaSOpsToolsWallet | Org2 CA Saas Admin  | Org2MSP       | Org2Saas Admin            | Org2MSP |

  @opsToolsFabric
  Scenario Outline: It should connect to a SaaS environment
    Given an environment 'mySaaSOpsToolsFabric' of type 'SaaS' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1 CA Saas Admin' and mspid 'Org1MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering Org Saas CA Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering Org Saas Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1Saas Admin' and mspid 'Org1MSP' exists
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
      | Node                        | Ordering Org Saas CA                            | Name: Ordering Org Saas CA\\nAssociated Identity:\\nOrdering Org Saas CA Admin              |
      | Node                        | Ordering Service Saas                              | Name: Ordering Service Saas\\nMSPID: OrdererMSP\\nAssociated Identity:\\nOrdering Org Saas Admin |
      | Node                        | Org1 CA Saas                                        | Name: Org1 CA Saas\\nAssociated Identity:\\nOrg1 CA Saas Admin                                    |
      | Node                        | Org2 CA Saas                                        | Name: Org2 CA Saas\\nAssociated Identity:\\nOrg2 CA Saas Admin                                    |
      | Node                        | Org1 Peer Saas                                      | Name: Org1 Peer Saas\\nMSPID: Org1MSP\\nAssociated Identity:\\nOrg1Saas Admin                 |
      | Node                        | Org2 Peer Saas                                      | Name: Org2 Peer Saas\\nMSPID: Org2MSP\\nAssociated Identity:\\nOrg2Saas Admin                 |
      | Organizations               | OrdererMSP                                          | OrdererMSP                                                                                      |
      | Organizations               | Org1MSP                                        | Org1MSP                                                                                    |
      | Organizations               | Org2MSP                                        | Org2MSP                                                                                    |


  @opsToolsFabric
  Scenario: It should hide nodes on a SaaS environment
    Given an environment 'mySaaSOpsToolsFabric' of type 'SaaS' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1 CA Saas Admin' and mspid 'Org1MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org2 CA Saas Admin' and mspid 'Org2MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering Org Saas CA Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Ordering Org Saas Admin' and mspid 'OrdererMSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org1Saas Admin' and mspid 'Org1MSP' exists
    And the wallet 'SaaSOpsToolsWallet' with identity 'Org2Saas Admin' and mspid 'Org2MSP' exists
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
