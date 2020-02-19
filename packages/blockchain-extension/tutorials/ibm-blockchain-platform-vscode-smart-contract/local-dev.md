**Tutorial 1**
## **Local Smart Contract Development**
`20-30 mins`

Follow the typical workflow from generating a new default smart contract project, deploying code to the _1 Org Local Fabric_ environment, and testing out your transactions via an application gateway.


## Learning Objectives

* Create a new default smart contract project
* Package a smart contract
* Start and use the local, pre-configured Hyperledger Fabric environment
* Deploy the smart contract on _1 Org Local Fabric_
* Edit and upgrade the contract
* Transact on your locally-deployed smart contract

---
<details>
<summary><b>1. Create a new default smart contract project</b></summary>

The extension can generate a smart contract skeleton in your chosen Hyperledger Fabric supported programming language. This means you start with a basic but useful smart contract rather than a blank-sheet.

For the purposes of this tutorial, we'll use TypeScript as the main example language. Java examples are also shown.

> In VS Code, every command can be executed from the Command Palette (press `Ctrl+Shift+P`, or `Cmd+Shift+P` on MacOS). All of this extension's commands start with `IBM Blockchain Platform:`. In the tutorial steps, we'll explain where to click in the UI, but look out for comment-boxes like this one if you want to know the Command Palette alternatives.

1. In the left sidebar, click on the __IBM Blockchain Platform__ icon (it looks like a square, and will probably be at the bottom of the set of icons if this was the latest extension you installed)

2. Mouse-over the `SMART CONTRACTS` panel, click the `...` menu, and select `Create New Project` from the dropdown.

   > Command Palette alternative: `Create New Project`

3. For this tutorial, choose the `Default Contract` option. The `Private Data Contract` will be covered in a future tutorial.

4. Choose a smart contract language. JavaScript, TypeScript, Java and Go are all available. This tutorial will be easiest to follow if you choose `TypeScript` or `Java` (please remember to expand the Java sections if you choose Java).

5. The extension will ask you if you want to name the asset in the generated contract. This will default to `MyAsset`, but you're welcome to change it.  What do you intend to use your blockchain for? This will determine what type of asset you create, update and read from the ledger: `Radish`? `Pineapple`? `Penguin`? Pick whatever you like! For this tutorial, we'll stick with `MyAsset`.

   > __Pro Tip:__ If you decide to change the name of your asset, remember to swap out `MyAsset` for whatever you named it in future steps!

6. Choose a location to save the project.  Click `Browse`, then click `New Folder`, and name the project what you want e.g. `demoContract`.

   > __Pro Tip:__ Avoid using spaces when naming the project!

7. Click `Create` and then select the new folder you just created and click `Save`.

8. Finally, select `Add to workspace` from the list of options.

The extension will generate you a skeleton contract based on your selected language and asset name. Once it's done, you can navigate to the __Explorer__ view (most-likely the top icon in the left sidebar, which looks like a "document" icon) and open the `src/my-asset-contract.ts` (alternatively, Java contracts are in `src/main/java` directory, but being a Java developer you might already have guessed that). Congratulations, you've got yourself a smart contract project.

</details>

---

<details>
<summary><b>2. Understand the smart contract (optional)</b></summary>

The generated smart contract code scaffold provides a good example of some common operations for interacting with data on a blockchain ledger. In this optional step, we'll take a look at the functions included in the generated contract and explain what they do. 

> __Pro Tip:__ This entire section is optional, so free to skip to step 3 if you want to hurry through the tutorial.

Notice the lines that start with `@Transaction` - these are functions that define your contract's transactions i.e. the things it allows you to do to interact with the ledger.

Skipping over the first one (`myAssetExists`), take a look at the `createMyAsset` function:

<details open="true">
<summary> Typescript </summary>

```typescript
    @Transaction()
    public async createMyAsset(ctx: Context, myAssetId: string, value: string): Promise<void> {
        const exists = await this.myAssetExists(ctx, myAssetId);
        if (exists) {
            throw new Error(`The my asset ${myAssetId} already exists`);
        }
        const myAsset = new MyAsset();
        myAsset.value = value;
        const buffer = Buffer.from(JSON.stringify(myAsset));
        await ctx.stub.putState(myAssetId, buffer);
    }
```
</details>
<details>
<summary> Java </summary>

```java
    @Transaction()
    public void createMyAsset(String myAssetId, String value) {
        Context ctx = getContext();
        boolean exists = myAssetExists(myAssetId);
        if (exists) {
            throw new RuntimeException("The asset "+myAssetId+" already exists");
        }
        MyAsset asset = new MyAsset();
        asset.setValue(value);
        ctx.putState(myAssetId, asset.toJSONString().getBytes(UTF_8));
    }
```
</details>


The empty brackets in `@Transaction()` tells us that this function is intended to change the contents of the ledger. Transactions like this are typically __submitted__ (as opposed to __evaluated__) - more on that later in this tutorial! The function is called `createMyAsset` and it takes `myAssetId` and a `value`, both of which are strings.  When this transaction is submitted, a new asset will be created, with key `myAssetId` and value `value`. For example if we were to create "001", "A juicy delicious pineapple", then when we later read the value of key `001`, we'll learn the value of that particular state is `A juicy delicious pineapple`.

Now, take a look at the next transaction:

<details open="true">
<summary> Typescript </summary>

```typescript
    @Transaction(false)
    @Returns('MyAsset')
    public async readMyAsset(ctx: Context, myAssetId: string): Promise<MyAsset> {
        const exists = await this.myAssetExists(ctx, myAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }
        const buffer = await ctx.stub.getState(myAssetId);
        const myAsset = JSON.parse(buffer.toString()) as MyAsset;
        return myAsset;
    }
```
</details>
<details>
<summary> Java </summary>

```java
    @Transaction()
    public MyAsset readMyAsset(String myAssetId) {
        Context ctx = getContext();
        boolean exists = myAssetExists(myAssetId);
        if (!exists) {
            throw new RuntimeException("The asset "+myAssetId+" does not exist");
        }

        MyAsset newAsset = MyAsset.fromJSONString(new String(ctx.getState(myAssetId),UTF_8));
        return newAsset;
    }
```
</details>

This one starts with `@Transaction(false)` - the "false" means that this function is not typically intended to change the contents of the ledger. Transactions like this are typically __evaluated__. You'll often hear such transactions referred to as "queries".  As you can see, this function only takes `myAssetId`, and will return the value of the whatever state that key points to.

Take a look at the other transactions in the contract at your leisure, then when you're happy, let's move on to starting the 1 Org Local Fabric environment...
</details>

---


<details>
<summary><b>3. Start the 1 Org Local Fabric environment</b></summary>

The panel titled `FABRIC ENVIRONMENTS` (in the IBM Blockchain Platform view) allows you to operate a simple Hyperledger Fabric runtime using Docker on your local machine. Initially, it will be stopped, and you should see:

```
1 Org Local Fabric  ○ (click to start).
```

1. Click that message and the extension will start spinning up Docker containers for you. The message "1 Org Local Fabric runtime is starting..." will appear, with a loading spinner, and when the task is complete you will see a set of expandable/collapsible sections labelled `Smart Contracts`, `Channels`, `Nodes` and `Organizations`.

> Command Palette alternative: `Connect to a Fabric Environment`

That's all you need to do in this step, but before moving on let's learn a little more about what _1 Org Local Fabric_ comprises.  We won't go into _too_ much detail in this tutorial, but here are a few handy facts to know:

<!-- TO DO: Replace this with a link to the Fabric docs and a diagram perhaps?? -->

* The `Smart Contracts` section shows you the `Instantiated` and `Installed` contracts on this network. The next step in this tutorial will have us __install__ and __instantiate__ a smart contract from a package.
* Under `Channels` there is a single channel called `mychannel`. In order for a smart contract to be used, it must be __instantiated__ on a channel. This happens after we first __install__ the contract on peers.
* The `Nodes` section contains a single "peer" (`Org1Peer1`).
* There is also a single Certificate Authority (CA) `Org1CA`, and a single orderer node `Orderer`.
* There is an organization in this simple blockchain network called `Org1`. Recall that `Org1` owns the peer we saw in the `Nodes` section. A network with just a single peer-owning organization isn't very realistic for real-world use, as the whole point is to _share_ a ledger between _multiple_ organizations, but it's sufficient for local development purposes. Under `Organizations` you will see `Org1MSP`: this is Org1's `MSP ID`.
* You may find it useful to know that the following Docker containers are started on your local machine: Orderer, Certificate Authority, CouchDB, and Peer.

Now you've started up the local Fabric runtime, it's time to install and instantiate your smart contract...

</details>

---

<details>
<summary><b>4. Package, install and instantiate the smart contract</b></summary>

There are 3 necessary steps to go from a smart contract project (like the one we've generated in this tutorial) to a smart contract that's running on a blockchain network, ready to be interacted with. Those steps are:

1. Package the smart contract
2. Use the package to install the smart contract on Fabric peers
3. Instantiate the smart contract on a Fabric channel

Using this extension, developers can complete all 3 steps in a single action (on a simple environment like _1 Org Local Fabric_). Alternatively, you could perform each step individually - this is a little slower, but may help you understand the steps better. We'll _instantiate_ the contract using the "1-step method", then make a small change and _upgrade_ it using the "3-step method" - once you've tried both, you can pick which one you prefer to use going forward.

Here is how to package, install and instantiate from your open smart contract project:

1. In the `Fabric Environments` panel, look for `+ Instantiate` (it's under `Smart Contracts` > `Instantiated`) and click it.

2. You'll be asked to choose a smart contract to instantiate. Pick `demoContract` (it will have "Open Project" next to it).

3. If you're using Typescript, you will see `demoContract@0.0.1` appear in the `SMART CONTRACTS` panel, and then under `Smart Contracts` > `Installed` in the `FABRIC ENVIRONMENTS` panel. Your open project has been automatically packaged using the information in `package.json`, and installed on the only available peer (`Org1Peer1`).

   > __Pro Tip:__ Some langauges, like Java, don't take their name and version info from a json file. As such, if you're using Java, you'll be asked to enter a name (e.g. `demoContract`) and then a version (e.g. `0.0.1`) for your Java package at the command-palette. Then, the package and install steps will complete.

4. Next, you'll be asked what function to call on instantiate. If you wanted to use a specific function as part of your instantiate, you could enter something here.  Our sample needs no such function, so hit `Enter` to skip this step.

5. You'll be asked if you want to provide a private data configuration file. For this tutorial just click `No`, in future tutorials you will learn more about this.

6. You'll be asked to choose a smart contract endorsement policy. For this tutorial, pick  `Default (single endorser, any org)`, in future tutorials you will learn more about how and why you would want to change this.

Instantiation will take a few moments - watch out for the success message and `demoContract@0.0.1` appearing in the `Smart Contracts` > `Instantiated` list to confirm it's worked!

> Command Palette alternative: `Instantiate Smart Contract`

</details>

---

<details>
<summary><b>5. Upgrade an instantiated smart contract</b></summary>

In a typical workflow you will only instantiate a given smart contract once. As you then make changes to the contract code, you'll want to update the version that's running on your network, replacing the old version. This is achieved by _upgrading_ a smart contract.

First, lets make a small change to the smart contract, so that we've got a new version to upgrade to...

### Edit the contract

1. Navigate to the __Explorer__ view (most-likely the top icon in the left sidebar, which looks like a "document" icon) and open the `src/my-asset-contract.ts` (alternatively, Java contracts are in `src/main/java` directory)

2. Find the `createMyAsset` function in the contract, and edit the error that is thrown when the asset already exists i.e. edit this...

   ```         
       if (exists) {
            throw new Error(`The my asset ${myAssetId} already exists`);
       }
   ```
   ...And replace it with something like this:
   ```         
       if (exists) {
            throw new Error(`The my asset ${myAssetId} could not be created because it already exists`);
       }
   ```
3. Save your changes to the contract file.

   > __Note:__ Java developers can stop here; TypeScript developers should make sure they also follow steps 4, 5 and 6 to update their version in `package.json`

4. Open the `package.json` file.

5. Edit the version number i.e. edit this...

   ```
         "version": "0.0.1",
   ```
   ...And replace it with this:
   ```
         "version": "0.0.2",
   ``` 

6. Save your changes to the package file.

We've now got an updated smart contract package. Let's use it to upgrade our existing smart contract, this time using the "3-step process" (the 3 steps are Package, Install, Upgrade - although it would also work if you were Instantiating the contract for the first time).

### Step 1: package

1. Mouse-over the `SMART CONTRACTS` panel, click the `...` menu, and select `Package Open Project` from the dropdown.

   > Command Palette alternative: `Package Open Project`

   If you're using Java, please enter a name and a version for this project. The name must be the same as the contract you want to upgrade, and the version number must be different. If you've been following our naming suggestions so far, `demoContract` and `0.0.2` would be perfect.

2. You should see a new package on the list: `demoContract@0.0.2`.

The package you just created can be installed onto any Hyperledger Fabric peer (running at the correct version). For example, you could right-click and choose "Export Package", then deploy it into a cloud environment using the IBM Blockchain Platform operational tooling console. We'll learn how to do this later: for now, we'll use it to upgrade the contract on our 1 Org Local Fabric network, so there's no need to export your package just yet!

### Step two: install

In a real network, each of the organizations that will be endorsing transactions will install the smart contract on their own peers. Our basic 1 Org Local Fabric runtime only has a single peer-owning organization (`Org1`) with a single peer (`Org1Peer1`) and a single channel (`mychannel`).

So, we only have to install the new version of the contract on that single peer, then we will be able to upgrade the instance in `mychannel`.
To do this...

1. In the `Fabric Environments` panel, look for `+ Install` (it's under `Smart Contracts` > `Installed`) and click it.

2. You'll be asked to choose a package to install. Pick `demoContract@0.0.2` (it will have "Packaged" written next to it).

You should see `demoContract@0.0.2` appear under the Smart Contracts > Installed list. (Note: v0.0.1 will still be there: multiple versions of the same contract can be _installed_, but you cannot have 2 contracts _instantiated_ with the same name. That's why we need to _upgrade_ our existing demoContract!)

   > Command Palette alternative: `Install Smart Contract`


### Step three: upgrade

We've got our contract installed on all (one) of the peers that participate in `mychannel` so we can go ahead and upgrade.

1. In the `Fabric Environments` panel, look under `Smart Contracts` > `Instantiated` and find `demoContract@0.0.1`. Right-click it and select `Upgrade Smart Contract`.

   > Command Palette Alternative: `Upgrade Smart Contract`

2. You'll be asked to choose a smart contract to perform an upgrade with. Pick `demoContract@0.0.2` (it will have "installed" written next to it).

4. Next, you'll be asked what function to call on upgrade. If you wanted to use a specific function as part of your upgrade, you could enter something here.  Our sample needs no such function, so hit `Enter` to skip this step.

5. You'll be asked if you want to provide a private data configuration file. For this tutorial just click `No`, in future tutorials you will learn more about this.

6. You'll be asked to choose a smart contract endorsement policy. For this tutorial, pick  `Default (single endorser, any org)`, in future tutorials you will learn more about how and why you would want to change this.

Upgrade will take a while longer than install - watch out for the success message and `demoContract@0.0.2` appearing in the `Smart Contracts` > `Instantiated` list to confirm it's worked!

Note that the old version `demoContract@0.0.1` is _replaced_ with `demoContract@0.0.2`: the contract has been upgraded to the new version.

</details>

</details>

---

<details>
<summary><b>6. Submit and evaluate transactions</b></summary>

Fabric gateways are connections to peers participating in Hyperledger Fabric networks, which can be used by client applications to submit transactions. When you started the local runtime in `LOCAL FABRIC OPS`, a gateway was automatically created for you also. You'll find it under `FABRIC GATEWAYS`, and it's called `1 Org Local Fabric`.

To _use_ a gateway, you also need an identity valid for transacting on the network in question. Again, for the local Fabric runtime, this has already been set up for you!  Observe that under `FABRIC WALLETS` there is a wallet called `1 Org Local Fabric - Org1 Wallet  `, which contains an ID called `org1Admin`. If you hover your mouse over `1 Org Local Fabric` in the `FABRIC GATEWAYS` panel, you will see that it tells you "Associated wallet: 1 Org Local Fabric - Org1 Wallet".

So, you've got a Gateway, and an associated wallet with a single identity in it - this means the Gateway is ready to be used!

1. Click on `1 Org Local Fabric - Org1` (under `FABRIC GATEWAYS`) to connect via this gateway. You will now see `Connected via gateway: 1 Org Local Fabric - Org1, Using ID: org1Admin` and a collapsed section labelled  `Channels`.

2. Expand `Channels`, then expand `mychannel` and `demoContract@0.0.2`. You will see a list of all the transactions that were defined in your smart contract.

3. First, we will create an asset.  Right-click on createMyAsset and select `Submit Transaction`. You will be asked to provide arguments for the transaction: try `["001", "a juicy delicious asset"]` (or whatever key and value you like, but make sure you remember the key you use!).

   > Pro Tip: Arguments are submitted as JSON, so make sure you type the inputs exactly as shown, so that you're submitting an array of 2 strings as required by this transaction!

   > Command Palette alternative: Submit Transaction

4. You will then be asked to set the transient data for the transaction. Don't worry about that for now we will cover it in a later tutorial. For now just hit Enter.

   Success: there is now a juicy, delicious asset on our ledger!

5. Next, submit updateMyAsset in a similar way. This time, for the arguments, provide the same key and a different value e.g. `["001", "a tremendously delicious asset"]`. So, now the value of key 001 on our ledger should be "a tremendously delicious asset". Lets check that by reading the value back...

6. `readMyAsset` is for reading from rather than writing to the ledger, so this time select `Evaluate Transaction`. Enter `["001"]` (or whatever you set your key to) as the argument. You should see the following in the output console:

   ```
   [SUCCESS] Returned value from readMyAsset: {"value":"a tremendously delicious asset"}
   ```
   > Command Palette alternative: `Evaluate Transaction`

You've proven you can submit and evaluate transactions to update and read your ledger!

</details>

---

Completed all the steps? Congratulations, you now know the core workflow of local smart contract development. You've generated a skeleton contract, deployed it locally, and submitted/evaluated transactions using it.

If you wish to spend some more time locally developing your own smart contracts, Fabric Samples (accessed from the extension's homepage) can help you explore development concepts. If you're iterating a lot on your code, you should checkout our __Debug__ tutorial, it's _very_ useful for developers!

There's no need to worry about those concepts yet if you don't want to though: `demoContract` is perfect for carrying on with this tutorial series!

<a href='./cloud-setup.md'><h2 align='right'><b> Next: Create a cloud blockchain deployment ➔ </h2></b></a>
