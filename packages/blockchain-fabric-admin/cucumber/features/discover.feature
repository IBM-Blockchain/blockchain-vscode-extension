Feature: Discover Peers
  Discover Peers

  Scenario: Approve Smart Contract
    Given the lifecycle is setup orgOneOnly
    When I discover peers
    Then the list of discovered peers should be 'peer0.org1.example.com peer0.org2.example.com:9051'
