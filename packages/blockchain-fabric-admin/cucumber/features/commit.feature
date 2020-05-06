Feature: Commit Smart Contract
  Commit a smart contract definition

  Scenario Outline: Commit Smart Contract
    Given a '<language>' smart contract of type '<type>'
    And the package exists
    And the lifecycle is setup
    And the package is installed
    And the contract is approved
    When I commit the contract
    Then the smart contract should committed
    When I submit the transaction 'createCar' with arguments '001, bmw, x5, purple, caroline' to 'Org1MSP, Org2MSP'
    Then the transaction should be successful
    Examples:
      | language   | type   |
      | javascript | node   |
      | typescript | node   |
      | java       | java   |
      | go         | golang |

  Scenario Outline: Commit Smart Contract with endorsement policy
    Given a '<language>' smart contract of type '<type>'
    And the package exists
    And the lifecycle is setup
    And the package is installed
    And the contract is approved with sequence 2 and policy OR('Org1MSP.member', 'Org2MSP.member')
    When I commit the contract with sequence 2 and policy OR('Org1MSP.member', 'Org2MSP.member')
    Then the smart contract should committed
    When I submit the transaction 'createCar' with arguments '002, bmw, x5, purple, caroline' to 'Org1MSP'
    Then the transaction should be successful
    Examples:
      | language   | type   |
      | javascript | node   |
      | typescript | node   |
      | java       | java   |
      | go         | golang |

