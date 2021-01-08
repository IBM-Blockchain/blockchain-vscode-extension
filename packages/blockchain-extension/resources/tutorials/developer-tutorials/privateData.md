**Important:** Please ensure you have completed the Introductory series on VS Code before starting this tutorial.

**Learning Objectives**

- Understand what private data is and how it can be a beneficial addition to smart contracts.
- Implement private data so that you can use it in your smart contracts.

**What is private data?**

Private data is just that, data you would like to keep private. On the IBM Blockchain Platform, private data is any data about assets you would like to restrict access to; whether you want to keep it to yourself or share it with a select group of people.

**How does it work?**

Private data is stored in Private Data Collections - these are stored locally on authorized peers, and the information they contain is not visible on the World State. When a peer submits a transaction with private data, the details are written to their Private Data Collection using the transient data store, while a hash of the private data is stored on the World State for other members of the network to see. This hash acts as a permanent record that the transaction happened.

**Why not just use separate channels to keep data private?**

In many cases, users make separate channels for communicating data they would like to keep private. However, the issue with this method is that when a new member joins the network, you have a huge number of new channels to create with existing members. It also prevents you from sharing information with everyone on the network while keeping a portion of the data private. In addition to the operational overhead, bilateral channels can limit performance which is why they are not recommended - using private data collections will avoid this downside.

**Introducing the verify function**

In this tutorial you will be introduced to the verify function. This allows unauthorised peers to confirm that what's contained in the authorised peer's Private Data Collections is what they claim it to be. For example, if you bought a shiny new car and your friend Dan didn't believe you only spent £10,000 on it, he could use the data you provide on the car in a verify transaction to confirm that you did really spend that much!

So, let's get started.

---

<details>
<summary><b>1. Create a new smart contract project</b></summary>

Private Data Smart Contracts are available in TypeScript, Java and JavaScript, this tutorial will use TypeScript. The steps for this are very similar to those in Tutorial 1 of the Introductory Series, but here we will be choosing the Private Data Smart Contract.

> Commands can be executed from the Command Palette (`Ctrl+Shift+P` for Windows, `Cmd+Shift+P` for MacOS). For this extension, all commands start with `IBM Blockchain Platform:`. Throughout this tutorial, there will be side notes prompting you when an interaction can be done using the Command Palette.

1. Navigate to the __IBM Blockchain Platform__ window by selecting the corresponding icon from the icon panel on the left.

2. Hover over the `SMART CONTRACTS` panel, click the `...` menu, and select the `Create New Project` option from the dropdown.

    > Command Palette alternative: Create New Project

3. As this is a tutorial on private data, we will be using the `Private Data Contract`, so select this option.

4. Choose a smart contract language. As previously stated, this tutorial will use `TypeScript`, but feel free to choose `Java` or `JavaScript` if you would prefer to work with that.

5. The next option is whether you would like to name your private asset in the generated contract. The default is `MyPrivateAsset`, but feel free to name your asset whatever you want. However, we recommend sticking with `MyPrivateAsset` for this tutorial.

    > Pro Tip: If you decided to change the name of your asset, remember to swap `MyPrivateAsset` for your new name in future steps.

6. Choose a location to save the project. Click `Browse`, then
`New Folder` and name the project what you want e.g. `privateContract`. Make sure you avoid using spaces when you name the folder.

7. Click `Create`, select the new folder you created and click `Save`.

8. Finally, select `Add to workspace` from the options listed.

There will now be a skeleton contract in your desired language, containing your private asset. You can view your new contract by navigating to the Explorer view (the document looking icon in the left-hand icon bar), and opening `src/my-private-asset-contract.ts`.

Congratulations, you've created a Private Data Smart Contract!
</details>

---

<details><summary><b>2. Understand the smart contract project</b></summary>

The generated private data smart contract contains all the same functions as a regular contract but features an added verify transaction. In this optional step, we'll take a look at the differences between transactions on the `Default Smart Contract` and the `Private Data Contract`, focusing on the new transaction – `verifyPrivateAsset()`.

The main CRUD (`create`, `read`, `update` and `delete`) functions along with the `Exists` function do exactly as their names suggest.

In a `Default Smart Contract`, the functions appear as `createAsset()` or `deleteAsset()`. But in a Private Data Contract, they appear as;

`createMyPrivateAsset()`

`readMyPrivateAsset()`

`updateMyPrivateAsset()`

`deleteMyPrivateAsset()`

`privateMyAssetExists()`

The functions are discussed at length in the Introductory Series, so we recommend going and having a look at Step 2: Understand the smart contract (optional) in Tutorial 1: Local Smart Contract Development, if you feel like you need to refresh your memory on what these transactions do. However, there are a couple of small differences between how some of these transactions work on the `Default Smart Contract` and the `Private Data Contract` you have created.

Unlike the `create` and `update` transactions in the `Default Smart Contract`, the `create` and `update` transactions in the `Private Data Contract` make use of transient data, which you would provide when you submit one of these transactions. Transient data is temporary and local to a peer, so it is perfect for passing private data into a transaction. These features mean that any information provided as transient data will not be recorded on the public ledger.

The `verifyMyPrivateAsset` transaction can be used to verify if a given set of private data exists.

    @Transactions(false)

    public async verifyMyPrivateAsset(ctx: Context, myPrivateAssetId:   string, objectToVerify: MyPrivateAsset): Promise<boolean>

This transaction requires three arguments – `mspid`, `myPrivateAssetId` and the `objectToVerify` (made up of a key/value pair). The `mspid` is the ID of the organization that you want to verify against, for example if Bob wants to verify Alice's data then he would input Alice's MSPID. The `myPrivateAssetId` is simply the key that was used when saving the private data (supplied when passing in transient data) to the Private Data Collection. The object key and value will appear in the format `{"key":value"}`. For example, if Alice stores some private data `{"myPrivateValue":"50"}` in her Private Data Collection, identifiable by the MSPID `AliceOrg1MSP`, which only she has access to but wants to prove to Bob that it exists, Bob would use the verify transaction to confirm whether Alice is telling the truth or not. Bob can now submit the `verifyPrivateAsset()` transaction with the arguments: `mspid` Alice's is `AliceOrg1MSP`, `asset ID` which is on the public ledger as `myPrivateAssetID` and the object `{"myPrivateValue":"50"}`. If Alice provided the correct data, the transaction should return true as the hash provided matches the hash stored on the public ledger. We will look at this in more detail later.

Notice the lines that start with `@Transaction()`. These come before each function in the generated `Private Data Contract` and they define the preceding transaction to be a callable transaction function. `@Transaction()` takes a boolean parameter where `true` indicates that the function is intended to be called using  `submit` and `false` indicates that the function is intended to be called using `evaluate`, with the default being set to true. The differences between `@Transaction()` and `@Transaction(false)` is especially important when it comes to the `readMyPrivateAsset()` transaction. A `Submit transaction` MUST NOT be performed on the `readMyPrivateAsset()`transaction. Doing so would result in the returned private data being submitted to the public ledger.

At the top of the `Private Data Contract` you'll see the function `getCollectionName`, a helper function that returns the `collectionName` that is required when transacting with a private contract. It is currently implemented to utilize the implicit collection that is created when you create a Local Fabric network through the extension. Implicit collections are a v2.0 Hyperledger feature, find out more about them [on the official Hyperledger Fabric docs](https://hyperledger-fabric.readthedocs.io/en/release-2.2/private-data-arch.html#referencing-implicit-collections-from-chaincode).

It is also worth having a look at the collections.json file at the root of the file directory for your project. Collections.json is the file that defines information such as who can persist data, how long private data is stored in a private database and the number of peers required for disseminating data – as well as how many it can be distributed to. The file currently contains only an empty array as we'll be using implicit collections in this tutorial, when you want to stop using implicit collections there is an example collections.json [on the official Hyperledger Fabric docs](https://hyperledger-fabric.readthedocs.io/en/release-2.2/private-data-arch.html#private-data-collection-definition).
</details>

---

<details>
<summary><b>3. Set up your 2 Org Local Fabric network</b></summary>

In this step, we will take you through the steps of creating a 2 org network. However, if you already have a 2 org network set up, feel free to use that instead.

> Note: If you use your own network, add it as a collection in the collections.json file once the contract has been generated.

1. Hover over the `FABRIC ENVIRONMENTS` panel on the left hand side of the screen and select the +.
2. You will then be asked to `Select a method to add an environment`. Choose the `Create new from template` option.
3. From the list of network configuration options, choose the `2 Org template (2 CAs, 2 peers, 1 channel)`.
4. Give your network a name e.g. `newNetwork`. Whatever you find easy to identify!
5. Select `V2_0 (Recommended)` as the channel capability. Then press `enter` which will trigger your network runtime to start.

After a few minutes, you will have your 2 org network ready to use your new Private Data Smart Contract on!

This step also creates the implicit collections described in the previous step. As this is a 2 org network, 2 collections will be created. They will be created as `_implicit_org_Org1MSP` and `_implicit_org_Org2MSP` where `Org1MSP` and `Org2MSP` is the MSPID used to specify the organisation. Your MSPIDs for a network are found in the "Organizations" menu in the "Fabric Environments" panel.

</details>

---

<details>
<summary><b>4. Package and deploy the Private Data Smart Contract</b></summary>

We will now package and deploy our smart contract into the local environment. The VS Code extension has a simplified version of the process to deploy a smart contract..

> <br>
   > <b>Want to know more?</b><br>For more about smart contract packages (chaincode) and the lifecycle, check out the <a href="https://hyperledger-fabric.readthedocs.io/en/latest/chaincode_lifecycle.html">Hyperledger Fabric documentation</a>.
   > <br>&nbsp;

<br/>

**Steps to package and deploy a Private Data Smart Contract:**
*For more information on packaging and deploying a contract, view tutorial 3 of the basic tutorials series.*
1. Move the mouse over the title bar of the Smart Contracts view, click the "..." that appears and select "Package Open Project".
2. Select "tar.gz (V2 channel capabilities)" to deploy this contract in future to a channel with V2 channel capabilities. The Smart Contracts view will be updated to show the new package.
3. In the Fabric Environments view, click "mychannel" -> "+ Deploy smart contract".
4. In the Deploy Smart Contract form, select "privateContract@0.0.1" from the drop down list, and click 'Next'.
5. In step 2 of the form, default values for Definition name and version are provided and don't enter anything for Endorsement policy or Collections configuration as we will be using the preset implicit collections to demonstrate private contracts. Then click 'Next' to move to Step 3 of the deploy. - *For TypeScript smart contracts, both the name and version are taken from the <i>package.json</i> file in the root of the smart contract project.*
6. In step 3 of the form, the automated steps of the deploy are sumarized, click 'Deploy' to start the deployment.

Deployment may take a few minutes to complete.

When deployment has completed you will see the new smart contract listed under "mychannel" in the Fabric Environments view.

> Command Palette alternative: Deploy Smart Contract
</details>

---

<details>
<summary><b>5. Transact as Org1</b></summary>

In this step we will interact with the network as Org1 through a series of transactions. Providing the previous instructions have been followed correctly, all transactions should be successful as Org1 has access to the implicit Private Data Collection that is automatically created (`_implicit_org_1OrgMSP`).

> **Note:** When following the instructions below, do the following if you wish to use the command palette, otherwise ignore this and just follow the instructions below this note.
> 1. You will be asked to choose a gateway to connect with, select your new network, so `newNetwork > Org1`, if that's what you called it.
> 2. Choose your private data smart contract from the list of smart contracts. From here, the flow is the same as stated per instruction.


Let's start transacting!

1. Connect to `Org1`. To do this, select `newNetwork > Org1 Gateway` under the `FABRIC GATEWAYS`. Your Smart Contract should now be seen under `Channels > myChannel` in `FABRIC GATEWAYS`; if you select your smart contract then all the available transactions you can submit and evaluate will be there.

> Note: The extension will ask you to select a peer-targeting policy for this transaction after you've specified the transient data. We will use the default option for every transaction we submit. This is only mentioned in the following step so you are able to see where it fits in, but make sure you select default for every transaction.

2. Let's start off by creating an asset. Left click `createMyPrivateAsset` to open the Transaction View. We'll be using Manual Input so leave that selected and you should see `createMyPrivateAsset` as the preselected Transaction name. The Transaction Arguments should be prefilled with an object containing only `"myPrivateAssetId": ""`, enter as the value of this object `"001"`– this is the `assetID`. Then enter in the Transient data `{"privateValue":"150"}` – this is the private data, it states that the private value for asset 001, is 150. Leave the "Target specific peer (optional)" as it's default. Finally, select "Submit transaction". If your transaction was successful then the Transaction output box should show `No value returned from createMyPrivateAsset`.

3. To check that the private data was stored, we will now evaluate `readMyPrivateAsset` transaction. Using the Transaction View, select `readMyPrivateAsset` from the Transaction name dropdown menu. The Transaction arguments should be prefilled but if not enter `"001"` as the value again as in the previous step. Do not enter in any transient data, in the case that it is prefilled, clear it. Finally, select "Evaluate transaction". If your transaction was successful then the Transaction output box should show `Returned value from readMyPrivateAsset: {"privateValue": "150"}`.

4. Now try submitting an `updateMyPrivateAsset` transaction to update some information about the asset. Using the Transaction View, select `updateMyPrivateAsset` from the Transaction name dropdown menu. The Transaction arguments should be prefilled but if not enter `"001"` as the value again as in the previous step. Then enter in the Transient data `{"privateValue":"125"}`, this will change the private value to be 125. Finally, select "Submit transaction". If your transaction was successful then the Transaction output box should show `No value returned from updateMyPrivateAsset`.

Feel free to submit more transactions with the private asset; but the point is that Org1 has complete control over the asset and can see/change anything about said asset. Now let's see what happens when we connect to the network as Org2 and try to interact with the asset.

</details>

---

<details>
<summary><b>6. Transact as Org2</b></summary>

In this step we will interact with the network as Org2 through a series of transactions. Providing the previous instructions have been followed correctly, attempting to read the asset with ID `001` will not return anything as nothing with that ID has been written to the collection that Org2 is using. Using `verifyMyPrivateAsset` we'll be able to see that Org2 can verify that an asset with ID `001` exists in Org1.

1. Before connecting to the Org2 gateway, disconnect from Org1 by clicking the `disconnect` button on the top right of the gateways panel.

2. Connect to Org2 the same way you connected to Org1 previously. Select `newNetwork > Org2 Gateway` under `FABRIC GATEWAYS`. Now navigate to the list of available transactions for Org2 under `FABRIC GATEWAYS > Channels > mychannel > privateContract@0.0.1`. This list of transactions will be the same as for Org1.

3. Org2 is using a different implicit connection to Org1 and cannot see that Org1 has created an asset with the asset ID of 001. So let's see what happens when Org2 tries to read the transaction. As in step 5.3, left click the `readMyPrivateAsset` transaction to open the Transaction View. Enter `"001"` as the value for the prefilled object in the Transaction argument box and no transient data. Finally, select "Evaluate transaction". This will throw an error into your notifications and the Transaction output should show `Error evaluating transaction: error in simulation: transaction returned with failure: Error: The asset my private asset 001 does not exist`.

4. What if Org2 wanted to create their own private asset? As in step 5.2, submit a `createMyPrivateAsset` transaction. We could use 001 as the assetID (used when Org1 created their asset) but to easily distinguish between assets created by Org1 and Org2, let's use 002. Enter `"002"` for the assetID. Enter `{"privateValue":"150"}` as the transient data, and leave the Target specific peer selection as default. Finally, select "Submit transaction". If your transaction was successful then the Transaction output box should show `No value returned from createMyPrivateAsset`.

You should now feel more comfortable with the differences between transacting as an organisation that is a member of a private data collection and one that isn't. But what if Org2 wanted to check what Org1 had stored in their private data collection with the permission of Org1?

</details>

---

<details>
<summary><b>7. Using the verify transaction to check what is stored in a Private Data Collection</b></summary>

So if Org2 was a regulatory body and wanted to make sure that Org1's private asset was legally sound; Org1 could tell Org2 what the original value of the asset was, and Org2 could run a verify transaction to confirm this. This is what we will do in this step; please remain connected to the Org2 Fabric Gateway. Before carrying out this step, let us give you a bit of information about the verify transaction. The function appears in the contract like this;

    @Transactions(false)

    public async verifyMyPrivateAsset(ctx: Context, mspid: string, myPrivateAssetId: string, objectToVerify: MyPrivateAsset): Promise<boolean>

This shows that when the transaction is submitted, it is going to be looking for 3 arguments; the MSPID (`mspid`), the asset ID (`myPrivateAssetId`) and the object (`objectToVerify: MyPrivateAsset`), where the object is made up of a key and a value. As the contract is preconfigured to work with implicit collections, you will need to specify the MSPID of the organistion that you want to verify against - in our case it will be `Org1MSP` as we want to verify an asset that was created by a contract in Org1.

Once submitted, the output will either return true or false. True if the arguments match the original values for the asset, false if the arguments do not match the original values for the asset.

1. Left click `verifyMyPrivateAsset` from the list of transactions to open the Transaction view. For the arguments enter, you'll want the Transaction argument object to look like the following:

```json
{
  "mspid": "Org1MSP",
  "myPrivateAssetId": "001",
  "objectToVerify": {"privateValue": "125"}
}
```
<div class='indent'>
<em>Note: if you're using another language and have arguments such as keys such as `arg0` and `arg1` enter the values as above in the same order but leave the keys the same.</em>

The object includes the MSPID, asset ID and the private value of 125. Do not enter any transient data here and clear the input box if it is prefilled. Finally select "Evaluate transaction". The Transaction output will display `Returned value from verifyMyPrivateAsset: true`. The `true` part of that expression confirms that the information provided by Org1 to Org2 was in fact correct.
</div>

2. Feel free to have a go at submitting a verify transaction with incorrect arguments to prove that the transaction would provide a different outcome across the output. For example, submit a `verifyMyPrivateAsset` transaction with the original arguments as above but change the `"objectToVerify"` to have the value `{"privateValue": "150"}`  because Org1 may have forgotten they previously updated the value! Obviously 150 is not the same as 125 so the Transaction output would display `Returned value from verifyMyPrivateAsset: false`.

</details>

---

Congratulations - you have successfully created a Private Data Smart Contract, transacted as an authorised organisation and an unauthorised organisation and been introduced to the verify transaction.
