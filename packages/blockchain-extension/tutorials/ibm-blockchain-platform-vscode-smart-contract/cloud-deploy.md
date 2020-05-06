<!-- # TUTORIAL 3: Deploying and transacting with IBM Cloud -->

## **Deploying and transacting with IBM Cloud**
`15-20 mins`

> **Important:** You will need a **smart contract package** and a suitable **cloud environment** to follow this tutorial. Follow parts 1 and 2 of this series first for instructions.

Now you've got 2 tools in your blockchain-belt: this VS Code extension, and the operational tooling console for the cloud service. Since both are part of IBM Blockchain Platform, they work neatly together to support a workflow of:

- Develop smart contracts (VS Code)
- Manage a blockchain network (operational tooling console)
- Deploy smart contracts (operational tooling console)
- Develop client applications (VS Code)

You've already completed the first 2 parts of that flow in tutorials 1 and 2. Now, we'll cover the last 2 pieces!


### **Learning Objectives**

* Export packages from this VS Code extension and deploy to the cloud service
* Connect from this VS Code extension to contracts on the cloud service via a gateway
* Send transactions from your local machine to a blockchain ledger hosted on IBM Cloud

---
<details>
<summary><b>1. Export and deploy smart contracts</b></summary>

The same smart contract package you deployed to the local runtime in Tutorial 1 is also suitable for deployment in *any* IBM Blockchain Platform environment. Such as the one you just configured on IBM Cloud for example! To deploy your smart contract on the cloud service...

1. In this extension, go the IBM Blockchain Platform view

2. Under `SMART CONTRACTS`, locate your contract (you could use either `demoContract@0.0.1` or `demoContract@0.0.2` if you followed tutorial 1 - for this tutorial we'll assume you use the original generated contract, v0.0.1) and right-click it. Choose `Export Package` then select a location to save the .cds file.

   > Command Palette alternative: `Export Package`

3. Head to the cloud service's operational tooling console (it's a good idea to keep the ops console open in a browser alongside this VS Code extension - if you're lucky enough to have dual monitors, this is a good time to use them!). First, we will install your smart contract...
   * Click the `Smart contracts` tab.

   * Click `Install smart contract` and upload the `demoContract@0.0.1.cds` file you exported earlier. If you had more than one peer in your network, you'd have to select which peer(s) to install on (but if you're following these tutorials, you should only have 1, so it's an easy choice!).
   * Click the `Install smart contract` button to finalise the flow.

4. Just like with the local runtime, after installing a contract on a peer, we must now instantiate it on a channel. To do this via the operational tooling console...

   * On the smart contracts tab, find the smart contract from the list installed on your peers and click `Instantiate` from the overflow menu on the right side of the row.

   * On the side panel that opens, select a channel to instantiate the smart contract on. If following the tutorials, you'll select the only channel (`channel1` here). Then, click `Next`.

   * Specify the endorsement policy for the smart contract. When multiple organizations are members of the channel, you have the opportunity choose how many organizations are required to endorse the smart contract transactions. For now though, it's just you, so the default is fine.

   * You also need to select the organization members to be included in the endorsement policy. If you are following along in the tutorial, that would be `org1msp`.

   * If your smart contract includes Fabric private data collections, you need to upload the associated collection configuration JSON file, otherwise you can skip this step... `demoContract@0.0.1` does not use private data collections: we'll save those for a later tutorial!

   * On the last panel you are prompted to specify the smart contract function that you want to run when the smart contract starts, along with the associated arguments to pass to that function. As you may recall from when you instantiated this contract locally...  There's no need to enter anything here! Leave it blank and finalise the flow.

Job done! The contract you developed locally in VS Code is now instantiated remotely in your cloud service. The whole point of instantiating a smart contract is so that its transactions can be _used_ to interact with a ledger, so let's carry on to do just that!

At this point, you will have installed the contract on your IBM Cloud peer, and instantiated it on your IBM Cloud channel. In the local dev tutorial, the next thing you did was to use the automatically-configured gateway to discover the transactions available. You can do the same thing with the contract you just instantiated using the cloud service, but you'll need to create a new gateway first to tell this VS Code extension where to find it. Next, we'll learn how to do just that...

</details>

---

<details>
<summary><b>2. Obtain connection details from the operational tooling console</b></summary>

To interact with the contract you instantiated on IBM cloud, a gateway is required. Client applications written using Hyperledger Fabric SDKs can use gateways, and so can this VS Code extension! In this step, we'll add a gateway in VS Code and use it to submit/evaluate some transactions to the remote network. In later tutorials, we'll cover developing client apps, but the same gateway concepts will apply.

You'll need to get two things from the operational tooling console to create your gateway in VS Code:

1. An   `enroll ID` + `secret` (ok, that's 2 things, but they come as a pair!)
2. A `Connection Profile`

Here's how to get them, using the operational tooling console:

1. **Enroll ID + secret**
  
   1. Navigate to the `Nodes` panel, then open the CA for your peer-owning organization. If you were following the tutorials, this is `Org1 CA`.
  
   2. Click `Register user`.

   3. Choose an `Enroll ID` and an `Enroll secret` - these can be anything you like. For the purposes of this tutorial, let's go with `vscode` and `vscodepw`. Choose `client` as the Type, and use the root affiliation (it doesn't matter for our purposes!). For now we can leave maximum enrollments blank and hit `Next`.

   4. There is no need to add any attributes, so hit `Register user` and we're done!

   > **Note:** Setting a max enrollments number would be useful if you intended to send this enroll ID + secret to someone and want to make sure only that person ever uses them. A setting of 1 would mean that enrollment (which we'll see happen a little later in this tutorial) can only happen once: after that, the enroll ID + secret can never be exchanged for an identity again. When you're operating a real environment, working together with other developers, you might want to consider using this setting!

2. **Connection profile**

   1. Navigate to the `Smart contracts` panel in the operational tooling console.

   2. Find `demoContract` on the list of **instantiated** smart contracts (scroll down past the installed smart contracts to view them), click the `...` overflow menu and select `Connect with SDK`.

   3. Pick `org1msp` and `Org1 CA` as your MSP and Certificate Authority, then click `Download connection profile`.
    
    > **Note:** Its important you select both the MSP and the CA for the peer-owning organization - make sure you're selecting the right values here.

Ok, we've got both pieces we needed from the operational tooling console. Now, we can return to VS Code, and create the gateway...
</details>

---

<details>
<summary><b>3. Create a gateway and wallet in VS Code</b></summary>

1. In the `IBM Blockchain Platform` view, hover over `FABRIC GATEWAYS` and click the `+` button.

   > Command Palette alternative: `Add Gateway`

2. Name your gateway e.g. `ibm_cloud`.

3. You'll be asked for a connection profile, so hit Browse and pick the file you exported from the operational tooling console. Its name will be something like `channel1_demoContract_profile.json`.

You should see a new gateway named `ibm_cloud` in your gateways list. If you click on it (to try using it) you'll be asked for a wallet... But you don't have a wallet with your ID in yet! In fact, you haven't even exchanged the enroll ID and secret for an identity. Let's do that next...

1. Hover over `FABRIC WALLETS` and click the `+`.

   > Command Palette alternative: `Add Wallet`

2. Choose `Create a new wallet and add an identity` from the options to create our new wallet.

3. Name the wallet whatever you like - `ibm_cloud_wallet` for example.

4. Provide a name for the identity you're about to obtain! I'll call mine `ed`, but feel free to use your own name!

5. Enter the MSPID - you probably used `org1msp` for your peer-owning org if you were following the tutorials, so enter that.

6. Select `Select a gateway and provide an enrollment ID and secret` from the options - because that's _exactly_ what we want to do!

7. Choose your latest gateway (e.g. `ibm_cloud`) from the list.

8. Enter the enrollment ID - if you followed this tutorial's suggestion, that's `vscode`.

9. Enter the enrollment secret - if you followed this tutorial's suggestion, that's `vscodepw`.

You should see the new wallet and its ID appear in the `FABRIC WALLETS` section. What just happened is actually quite cool - we just used the dev tools to send an enrollment ID and secret off to the CA we set up running on IBM Cloud, and received back an ID suitable for transacting on that blockchain network, which we stowed neatly in a wallet.

If you tried clicking the `ibm_cloud` gateway after you added it, you'll recall that it asked for a wallet. We could select the wallet every time we want to use the gateway (useful if you plan to use multiple wallets with a gateway for whatever reason), but we can give ourselves a bit of a shortcut by associating the `ibm_cloud_wallet` with the `ibm_cloud` gateway. To do this...

1. Right-click on `ibm_cloud` on the `FABRIC GATEWAYS` list and select `Associate A Wallet`.

   > Command Palette alternative: `Associate A Wallet`

2. Pick `ibm_cloud_wallet`.

You'll see a new icon appear next to the gateway to show that a wallet has been associated.

</details>

---

<details>
<summary><b>4. Submit transactions</b></summary>

Everything is set! Let's submit a transaction from VS Code and make sure it gets through to the ledger on IBM Cloud.

1. Click on `ibm_cloud` in the `FABRIC GATEWAYS` list.

2. Open up `Channels` > `channel1` > `demoContract@0.0.1` to view the list of available transactions. Remember this is a different instance of the contract to the one we were using locally in an earlier tutorial... So the asset with key `001` _shouldn't_ exist yet...

3. Right-click `myAssetExists` and choose `Evaluate Transaction`. Enter `["001"]` as the key, and hit Enter again confirm the optional transient data. (Don't worry about "transient data", this will be explained in a later tutorial.)
 
   Check the Output. You should see:

   ```
   [5/1/2019 6:35:36 PM] [SUCCESS] Returned value from myAssetExists: false
   ```
   Excellent: the asset we haven't created yet on this ledger doesn't exist! So, let's create one!

   > Command Palette alternative: `Evaluate Transaction`

4. Right-click `createMyAsset`, choose `Submit Transaction` then enter `["001", "hello ibm cloud"]` as the arguments.

   > Command Palette alternative: `Submit Transaction`

5. We can prove that worked by choosing `Evaluate Transaction` on `readMyAsset` and entering `["001"]` as the argument. You should see the following output:

   ```
   [5/1/2019 6:38:29 PM] [SUCCESS] Returned value from readMyAsset: {"value":"hello ibm cloud"}
   ```
   Excellent: we've created an asset and read it!

As an interesting additional exercise, we can also look in the operational tooling console to see these transactions coming in! Back in the operational tooling console...

1. Open the `Channels` panel, then click on the `channel1` tile. You'll see a block height of 3 if you followed this tutorial exactly!

2. Click on the most recent block (the one at the top of the list under `Block history`) then on the subsequent page click on the latest (probably only) transaction on the `Transactions` list.

3. Notice the `Input` value in the details that are shown:

   ```
   ["MyAssetContract:createMyAsset","001","hello ibm cloud"]
   ```

Looks like that last transaction we submitted from VS Code has been recorded in our blockchain ledger. There's no way to edit this list of transactions: it's there forever, and is why we say blockchains are "immutable". Even though you may later delete asset `001`, its full history from creation, through any updates and reads and even the deletion itself are forever recorded on the ledger you are now viewing...

...Well, unless you're using the free trial of course ;) Remember that free trials of IBM Blockchain Platform on IBM Cloud are deleted after 30 days, so if you want to keep your shared immutable ledgers forever and run real workloads against them, you'll eventually need to look at the non-trial plan!

> **Pro Tip:** You might be wondering "what about the readMyAsset transaction"? Great question! Because that one was **evaluated** rather than submitted, it didn't update the ledger - this is exactly what transaction evaluation is designed to do! Submit transactions when you want to update the ledger, and evaluate them if you just need to query the ledger without updating it.

</details>

---

Congratulations, you've completed the set of Introduction tutorials! The smart contract you developed locally is now running on an IBM Blockchain Platform network on IBM Cloud, and you're able to transact from your local machine. 

<a href='./cloud-setup.md'><h4 align='right'><b> ◀ Prev: Create a cloud blockchain deployment</b></h4></a>
