Feature: Local Fabric Ops
    Description about feature here

    Scenario: Install smart contract button
        Given the Local Fabric is running
        Then there should be a installed smart contract tree item with a label '+ Install' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to '+ Install'

    Scenario: Instantiate smart contract button
        Given the Local Fabric is running
        Then there should be a instantiated smart contract tree item with a label '+ Instantiate' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to '+ Instantiate'

    Scenario: Peer Node
        Given the Local Fabric is running
        Then there should be a Node tree item with a label 'peer0.org1.example.com' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'peer0.org1.example.com'

    Scenario: CA Node
        Given the Local Fabric is running
        Then there should be a Node tree item with a label 'ca.org1.example.com' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'ca.org1.example.com'


    Scenario: Orderer Node
        Given the Local Fabric is running
        Then there should be a Node tree item with a label 'orderer.example.com' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to 'orderer.example.com'

