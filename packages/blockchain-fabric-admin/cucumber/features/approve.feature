Feature: Approve Smart Contract
  Approve a smart contract definition

  Scenario Outline: Approve Smart Contract
    Given a '<language>' smart contract of type '<type>'
    And the package exists
    And the lifecycle is setup
    And the package is installed
    When I approve the smart contract
    Then the smart contract should be approved
    Examples:
      | language   | type   |
      | javascript | node   |
      | typescript | node   |
      | java       | java   |
      | go         | golang |
