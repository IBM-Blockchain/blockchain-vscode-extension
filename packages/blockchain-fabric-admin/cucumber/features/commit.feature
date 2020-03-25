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
    Examples:
      | language   | type   |
      | javascript | node   |
      | typescript | node   |
      | java       | java   |
      | go         | golang |

