Feature: Discover Peers
  Discover Peers

  Scenario: Get a list of discovered peers
    Given the lifecycle is setup orgOneOnly
    When I discover peers
    Then the list of discovered peers should be 'peer0.org1.example.com:7051 peer0.org2.example.com:9051'

  Scenario: Deploy when using discovered peers
    Given a 'javascript' smart contract of type 'node' using 'fabcar' with name discoverFabCar
    And the package exists
    And the lifecycle is setup
    And the package is installed
    And the contract is approved
    When I commit the contract orgOneOnly
    Then the smart contract should committed
    Given a gateway using 'org1'
    When I submit the transaction 'createCar' with arguments '001, bmw, x5, purple, caroline' to 'Org1MSP, Org2MSP'
    Then the transaction should be successful
