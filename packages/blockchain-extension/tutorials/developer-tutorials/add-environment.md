<!-- Adding an Environment to connect to IBM Cloud -->

## **Adding an Environment to connect to IBM Cloud**
`20-30 mins`

> **Important:** You will need a **smart contract package** and a suitable **cloud environment** to follow this tutorial. Follow parts 1 and 2 of the introduction series first for instructions.

You may have already completed the Introduction series and deployed your smart contract using the operational console. In this tutorial we will look at how you can deploy your smart contract from VS Code. This is useful if you are still making lots of changes to your contract and want to be testing it in a cloud environment without leaving your development environment everytime you need to deploy an updated version.

### **Learning Objectives**

* Add a Fabric Environment to connect to the cloud service
* Deploy a smart contract to the cloud service

---

<details>
<summary><b>1. Using the operational tooling console, obtain the JSON node files</b></summary>
To add an environment to VS Code you will need some JSON files that describe how to connect to a node. These can be exported from the operational tooling console.

1. Navigate to the `Nodes` panel, then open your peer. Click the export button to download the JSON file to your machine.

2. Navigate to the `Nodes` panel, then open your orderer. Click the export button to download the JSON file to your machine.

3. Navigate to the `Nodes` panel, then open your certificate authority. Click the export button to download the JSON file to your machine.
</details>

---

<details>
<summary><b>2. Using the operational tooling console, obtain the JSON identity files</b></summary>
To enable VS Code to connect to a node an admin identity needs be provided. These are stored in the wallet in the operational console.

1. Navigate to the `Wallet` panel, then click on an identity for the `Org1`, and click export. If you followed the tutorial the there should be an identity called `Org1 Admin`.

2. Click on the identity for the `Orderer`, and click export. If you followed the tutorial there should be an identity called `Orderer Admin`.

3. Click on the identity for the `Certificate Authority`, and click export. If you followed the tutorial there should be an identity called `Org1 CA Admin`.
</details>

--- 

<details>
<summary><b>3. Using VS Code, import the identities</b></summary>
The identities that were exported need to be imported into VS Code. First we will add the identity for the peer

1. On the `Wallets` panel click the + button and select the option `Create a new wallet and add an identity`.

2. You will then be asked to enter a name for the wallet use `ibp-wallet`.

3. You will then be asked to provide the MSPID use `org1msp` if you followed the tutorial.

4. You will then be asked for the method for adding an identity choose `Provide JSON identity file from IBM Blockchain Platform`.

5. Browse to the location of the previously exported `Org1 Admin` file and select it.

6. If the JSON identity file does not contain the name property, you will be asked to enter a name for the identity, otherwise this step is skipped.

You will now have a new wallet called `ibp-wallet` containing the `Org1 Admin` identity. Now we need to add the identity for the orderer.

1. On the `Wallets` panel right click on `ibp-wallet` and choose `Add identity to wallet`.

2. You will then be asked to provide an MSPID use `osmsp`.

3. You will then be asked for the method for adding an identity choose `Provide JSON identity file from IBM Blockchain Plaform`.

4. Browse to the location of the previously exported `Orderer Admin` file and select it.

5. If the JSON identity file does not contain the name property, you will be asked to enter a name for the identity, otherwise this step is skipped.

Finally you now need to add the identity for the certificate authority

1. On the `Wallets` panel right click on `ibp-wallet` and choose `Add identity to wallet`.

2. You will then be asked to provide an MSPID. Use `org1msp` here.

3. You will then be asked for the method for adding an identity, select `Provide JSON identity file from IBM Blockchain Plaform`.

4. Browse to the location of the previously exported `Org1 CA Admin` file and select it.

5. If the JSON identity file does not contain the name property, you will be asked to enter a name for the identity, otherwise this step is skipped.

</details>

---

<details>
<summary><b>4. Using VS Code, add a new Fabric Environment</b></summary>
Now we have all the identities imported in VS Code we can create the Fabric Environment.

1. On the `Fabric Environment` panel click the `+` button.

2. You will asked to enter a name for the environment, use `ibp`.

3. Browse to the location on the nodes files that you exported from the operation console. You can select multiple files to add.

4. You will then be asked if you want to add more files. Select `Done adding nodes`.

You will now see your new environment in the `Fabric Environment` panel.
</details>

--- 

<details>
<summary><b>5. Using VS Code, associate identities with the nodes</b></summary>
Now we have created an environment we need to associate each node with an identity.

1. On the `Fabric Environment` panel click the `ibp`.

2. You will then see a list of all the nodes that need identities associated with them. Click `Ordering Service-1`.

3. You will then be asked to choose a wallet, select `ibp-wallet`.

4. You will then be asked to choose an identity, select `Orderer Admin`

5. You will then be asked if you want to associate the identity with other nodes, select `No`.

Congratulations you have associated an identity with the `Orderer` node. Now we need to Associate an identity with the `Peer` node

1. Click `Peer Org1`.

2. You will then be asked to choose a wallet, select `ibp-wallet`.

4. You will then be asked to choose an identity, select `Org1 Admin`.

5. You will then be asked if you want to associate the identity with other nodes, select `No`.

The final node to setup is the certificate authority.

1. Click on `Org1 CA`.

2. You will then be asked which wallet to add the identity to, select `ibp-wallet`.

3. You will then be asked to provide a name for the identity, use `Org1 CA Admin`.

4. You will then be asked if you want to associate the identity with other nodes, select `No`.

Now all the nodes will have been successfully associated with an identity. VS Code will now connect to the environment and you will see the installed and instantiated smart contracts.

</details>

---

<details>
<summary><b>6. Using VS Code, deploy a smart contract</b></summary>

We can now deploy a smart contract to the environment. These steps assume that you have deployed a smart contract before so provide only minimal instructions. For more details see the Local smart contract development tutorial. 

1. Create a smart contract

2. Package the smart contract

3. Click `+ install` on the `Fabric Environments` panel.

4. Click `+ instantiate` on the `Fabric Environments` panel.

You have now deployed a smart contract to your IBM Cloud instance. You can see the deployed smart contract in the operational console.
</details>

--- 

Congratulations - you have now successfully added an environment, and deployed to IBM Cloud.
