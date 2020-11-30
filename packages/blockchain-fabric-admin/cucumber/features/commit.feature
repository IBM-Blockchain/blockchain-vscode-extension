Feature: Commit Smart Contract
  Commit a smart contract definition

  Scenario Outline: Commit Smart Contract
    Given a '<language>' smart contract using Fabric v2 of type '<type>' using 'fabcar'
    And the package exists
    And the lifecycle is setup
    And the package is installed
    And the contract is approved
    When I commit the contract
    Then the smart contract should committed
    Given a gateway using 'org1'
    When I submit the transaction 'createCar' with arguments '001, bmw, x5, purple, caroline' to 'Org1MSP, Org2MSP'
    Then the transaction should be successful
    Examples:
      | language   | type   |
      | javascript | node   |
      | typescript | node   |
      | java       | java   |
      | go         | golang |

  Scenario Outline: Commit Smart Contract with endorsement policy
    Given a '<language>' smart contract using Fabric v2 of type '<type>' using 'fabcar'
    And the package exists
    And the lifecycle is setup
    And the package is installed
    And the contract is approved with sequence '2' and policy 'OR('Org1MSP.member', 'Org2MSP.member')'
    When I commit the contract with sequence '2' and policy 'OR('Org1MSP.member', 'Org2MSP.member')'
    Then the smart contract should committed
    Given a gateway using 'org1'
    When I submit the transaction 'createCar' with arguments '002, bmw, x5, purple, caroline' to 'Org1MSP'
    Then the transaction should be successful
    Examples:
      | language   | type   |
      | javascript | node   |
      | typescript | node   |
      | java       | java   |
      | go         | golang |

  Scenario Outline: Commit Smart Contract with collections config
    Given a '<language>' smart contract using Fabric v2 of type '<type>' using 'marbles'
    And the package exists
    And the lifecycle is setup
    And the package is installed
    And the contract is approved with collection config and policy 'OR('Org1MSP.member', 'Org2MSP.member')'
    When I commit the contract with collection config and policy 'OR('Org1MSP.member', 'Org2MSP.member')'
    Then the smart contract should committed
    Given a gateway using 'org1'
    When I submit the transaction 'initMarble' with transient data '{"marble": "{\"name\": \"marble1\", \"color\": \"blue\", \"size\": 35, \"owner\": \"tom\", \"price\": 99}"}' to 'Org1MSP'
    Then the transaction should be successful
    When I evaluate the transaction 'readMarblePrivateDetails' with arguments 'marble1' to 'Org1MSP'
    Then the transaction should be successful
    Given a gateway using 'org2'
    When I evaluate the transaction 'readMarblePrivateDetails' with arguments 'marble1' to 'Org2MSP'
    Then the transaction should fail
    Examples:
      | language   | type   |
      | go         | golang |

