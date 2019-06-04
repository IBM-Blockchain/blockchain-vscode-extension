Feature: Local Fabric Ops
    Tests all the features of the fabric ops panel

    Scenario Outline: There should be a tree item
        Given the Local Fabric is running
        Then there should be a <treeItem> tree item with a label '<label>' in the 'Local Fabric Ops' panel
        And the tree item should have a tooltip equal to '<tooltip>'
        Examples:
        | treeItem                    | label                  | tooltip                |
        | installed smart contract    | + Install              | + Install              |
        | instantiated smart contract | + Instantiate          | + Instantiate          |
        | Node                        | peer0.org1.example.com | peer0.org1.example.com |
        | Node                        | ca.org1.example.com    | ca.org1.example.com    |
        | Node                        | orderer.example.com    | orderer.example.com    |
