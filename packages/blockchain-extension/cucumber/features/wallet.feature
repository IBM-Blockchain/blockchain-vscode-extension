Feature: Fabric Wallets
    Test all the features of a fabric wallet

    Scenario: local fabric wallets are created automatically
        Given the Local Fabric is running
        And the 'Org1' wallet
        Then there should be a tree item with a label 'Local Fabric - Org1 Wallet' in the 'Fabric Wallets' panel
        And the tree item should have a tooltip equal to 'Local Fabric - Org1 Wallet'
        And there should be a identity tree item with a label 'admin ⭑' in the 'Fabric Wallets' panel for item Local Fabric - Org1 Wallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'
        And there should be a tree item with a label 'Local Fabric - Orderer Wallet' in the 'Fabric Wallets' panel
        And the tree item should have a tooltip equal to 'Local Fabric - Orderer Wallet'
        And there should be a identity tree item with a label 'admin ⭑' in the 'Fabric Wallets' panel for item Local Fabric - Orderer Wallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'


    Scenario: create an identity with attributes
        Given the Local Fabric is running
        And the '1 Org Local Fabric' environment is connected
        And the 'Org1' wallet
        When I register a new identity 'attributes_user' with the attributes '[{"name": "hello", "value": "world", "ecert": true}]'
        Then there should be an identity tree item with a label 'attributes_user' in the 'Fabric Wallets' panel for item Local Fabric - Org1 Wallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nhello:world\nhf.Affiliation:\nhf.EnrollmentID:attributes_user\nhf.Type:client'

    Scenario: delete an identity
        Given the Local Fabric is running
        And the '1 Org Local Fabric' environment is connected
        And the 'Org1' wallet
        And the identity 'example_identity' exists
        When I delete the identity 'example_identity'
        Then there shouldn't be a identity tree item with a label 'example_identity' in the 'Fabric Wallets' panel for item Local Fabric - Org1 Wallet

    @otherFabric
    Scenario: create a new wallet using certs
        When I create a wallet 'myWallet' using certs with identity name 'conga' and mspid 'Org1MSP'
        Then there should be a tree item with a label 'myWallet' in the 'Fabric Wallets' panel
        And the tree item should have a tooltip equal to 'myWallet'
        And there should be a identity tree item with a label 'conga' in the 'Fabric Wallets' panel for item myWallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'

    @otherFabric
    Scenario: create a new wallet using an enrollId and secret
        Given the gateway 'myGateway' is created
        When I create a wallet 'myOtherWallet' using enrollId with identity name 'biscuit' and mspid 'Org1MSP'
        Then there should be a tree item with a label 'myOtherWallet' in the 'Fabric Wallets' panel
        And the tree item should have a tooltip equal to 'myOtherWallet'
        And there should be a identity tree item with a label 'biscuit' in the 'Fabric Wallets' panel for item myOtherWallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'

    @otherFabric
    Scenario: add a new identity using a JSON file
        Given the wallet 'myOtherWallet' with identity 'biscuit' and mspid 'Org1MSP' exists
        When I create an identity using JSON file with identity name 'secondBiscuit' and mspid 'Org1MSP' in wallet 'myOtherWallet'
        Then there should be a identity tree item with a label 'secondBiscuit' in the 'Fabric Wallets' panel for item myOtherWallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'

    @otherFabric
    Scenario: create a new wallet using a JSON file
        When I create a wallet 'myWalletyWallet' using JSON file with identity name 'jason' and mspid 'Org1MSP'
        Then there should be a tree item with a label 'myWalletyWallet' in the 'Fabric Wallets' panel
        And the tree item should have a tooltip equal to 'myWalletyWallet'
        And there should be a identity tree item with a label 'jason' in the 'Fabric Wallets' panel for item myWalletyWallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'

    @otherFabric
    Scenario: add a new identity using certs
        Given the wallet 'myWalletyWallet' with identity 'jason' and mspid 'Org1MSP' exists
        When I create an identity using certs with identity name 'jasonTwo' and mspid 'Org1MSP' in wallet 'myWalletyWallet'
        Then there should be a identity tree item with a label 'jasonTwo' in the 'Fabric Wallets' panel for item myWalletyWallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'

    @otherFabric
    Scenario: add a new identity using an enrollId and secret
        Given the gateway 'myGateway' is created
        Given the wallet 'myWalletyWallet' with identity 'jason' and mspid 'Org1MSP' exists
        When I create an identity using enrollId with identity name 'otherJason' and mspid 'Org1MSP' in wallet 'myWalletyWallet'
        Then there should be a identity tree item with a label 'otherJason' in the 'Fabric Wallets' panel for item myWalletyWallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nNone'

    @otherFabric
    Scenario: create an identity with attributes
        Given an environment 'myFabric' exists
        And the wallet 'myWallet' with identity 'conga' and mspid 'Org1MSP' exists
        And the environment is setup
        And the 'myFabric' environment is connected
        When I register a new identity 'attributes_user' with the attributes '[{"name": "hello", "value": "world", "ecert": true}]'
        Then there should be an identity tree item with a label 'attributes_user' in the 'Fabric Wallets' panel for item myWallet
        And the tree item should have a tooltip equal to 'Attributes:\n\nhello:world\nhf.Affiliation:\nhf.EnrollmentID:attributes_user\nhf.Type:client'
