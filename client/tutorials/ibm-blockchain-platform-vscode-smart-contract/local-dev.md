**Tutorial 1**
## **Local Smart Contract Development**
`20-30 mins`

Follow the typical workflow from generating a new smart contract project, deploying code to the _Local Fabric_ runtime, and testing your transactions via an application gateway.


## Learning Objectives

* Create a new smart contract project
* Package a smart contract
* Start and use the local, pre-configured Hyperledger Fabric runtime
* Deploy the smart contract on _Local Fabric_
* Transact on your locally-deployed smart contract

---
<details>
<summary><b>1. Create a new smart contract project</b></summary>

The extension can generate a smart contract skeleton in your chosen Hyperledger Fabric supported programming language. This means you start with a basic but useful smart contract rather than a blank-sheet!

For the purposes of this tutorial, we'll use TypeScript as the main example language. Java examples are also shown.

> In VS Code, every command can be executed from the Command Palette (press `Ctrl+Shift+P`, or `Cmd+Shift+P` on MacOS). All of this extension's commands start with `IBM Blockchain Platform:`. In the tutorial steps, we'll explain where to click in the UI, but look out for comment-boxes like this one if you want to know the Command Palette alternatives.

1. In the left sidebar, click on the __IBM Blockchain Platform__ icon (it looks like a square, and will probably be at the bottom of the set of icons if this was the latest extension you installed!)

2. Mouse-over the `SMART CONTRACTS` panel, click the `...` menu, and select `Create New Project` from the dropdown.

> Command Palette alternative: `Create New Project`

3. Choose a smart contract language. JavaScript, TypeScript, Java and Go are all available. For the purpose of this tutorial, please choose `TypeScript`; (unless you want to use Java, then please remember to expand the Java sections)

4. The extension will ask you if you want to name the asset in the generated contract. This will default to `MyAsset`, but you're welcome to have some fun ;)  What do you intend to use your blockchain for? This will determine what type of asset you create, update and read from the ledger: `Radish`? `Pineapple`? `Penguin`? Pick whatever you like! For the sake of this tutorial, we'll be boring and stick with `MyAsset`.

> __Pro Tip:__ If you decide to change the name of your asset, remember to swap out `MyAsset` for whatever you named it in future steps!

5. Choose a location to save the project.  Click `Browse`, then click `New Folder`, and name the project what you want e.g. `demoContract`.

> __Pro Tip:__ Avoid using spaces when naming the project!

6. Click `Create` and then select the new folder you just created and click `Save`.

7. Finally, select `Add to workspace` from the list of options.

The extension will generate you a skeleton contract based on your selected language and asset name. Once it's done, you can navigate to the __Explorer__ view (most-likely the top icon in the left sidebar, which looks like a "document" icon) and open the `src/my-asset-contract.ts` file to see your smart contract code scaffold. Great work, you've got yourself a smart contract - let's take a look at its contents...  (Java contracts are in `src/main/java` directory, but being a Java developer you might have guessed that)

</details>

---

<details>
<summary><b>2. Understand the smart contract</b></summary>

The generated smart contract code scaffold provides a good example of some common operations for interacting with data on a blockchain ledger. If you're in a big rush, you could skip this section, but why not stay a while and listen as we learn the basic anatomy of a smart contract!

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

Take a look at the other transactions in the contract at your leisure, then when you're happy, let's move on to packaging and deploying that contract so that we can start using it...
</details>

---

<details>
<summary><b>3. Package the smart contract</b></summary>

Now that you have created your smart contract and understand the transactions therein, it’s time to package it. Smart contract projects are packaged into `.CDS` files - a special type of file that can be installed on Hyperledger Fabric peers.

1. In the left sidebar, click on the __IBM Blockchain Platform__ icon.

2. Mouse-over the `SMART CONTRACTS` panel, click the `...` menu, and select `Package Open Project` from the dropdown.

> Command Palette alternative: `Package Open Project`

If you're using Java, please enter a name and a version for this project. `demoContract` and `0.0.1` would be perfect.

3. You should see a new package on the list, `demoContract@0.0.1` (or the name you gave to the packaged contract), if everything went well.

The package you just created can be installed onto any Hyperledger Fabric peer (running at the correct version). For example, you could right-click and choose "Export Package", then deploy it into a cloud environment using the IBM Blockchain Platform operational tooling console. We'll learn how to do this later: for now, we'll deploy the package locally on the runtime that comes pre-configured with the VS Code extension, so there's no need to export your package just yet!

</details>

---

<details>
<summary><b>4. Fabric Environments</b></summary>

The panel titled `Fabric Environments` (in the IBM Blockchain Platform view) allows you to operate a simple Hyperledger Fabric runtime using Docker on your local machine. Initially, it will be stopped, and you should see:

```
Local Fabric  ○ (click to start).
```

Click that message and the extension will start spinning up Docker containers for you. The message "Local Fabric runtime is starting..." will appear, with a loading spinner, and when the task is complete you will see a set of expandable/collapsible sections labelled `Smart Contracts`, `Channels`, `Nodes` and `Organizations`.

> Command Palette alternative: `Connect to a Fabric Environment`

That's all you need to do in this step, so if you're in a rush, but whilst you're waiting for Local Fabric to start up, let's learn a little more about what it comprises. 

We won't go into _too_ much detail in this tutorial, but here are a few handy facts to know:

* The `Smart Contracts` section shows you the `Instantiated` and `Installed` contracts on this network. The next couple of steps in this tutorial will have us __install__ then __instantiate__ the smart contract we've packaged.
* Under `Channels` there is a single channel called `mychannel`. In order for a smart contract to be used, it must be __instantiated__ on a channel. This happens in the _next_ step of this tutorial, after we first __install__ the contract on a peer.
* The `Nodes` section contains a single "peer" (`peer0.org1.example.com`). The naming follows Hyperledger Fabric conventions, and we can see from the "org1" part that this peer is owned by `Org1`.
* There is also a single Certificate Authority (CA) `ca.org1.example.com`, and a single orderer node `orderer.example.com`. Again, you'll learn more about these node types when building your own network later - for now, it is enough to know that they're essential parts of the network, and so the extension has created them for you!
* There is a single organization in this simple blockchain network called `Org1`. Recall that `Org1` owns the peer we saw in the `Nodes` section. A network with just a single organization isn't very realistic for real-world use, as the whole point is to _share_ a ledger between _multiple_ organizations, but it's sufficient for local development purposes! Under `Organizations` you will see `Org1MSP`: this is Org1's `MSP ID`. You don't need to worry too much about this right now: Membership Services Providers (MSPs) will be covered when you start building your own network in later tutorials. 
* If you're a big Docker fan, you may find it useful to know that the following containers are started on your local machine: Orderer, Certificate Authority, CouchDB, and Peer.

Now you've started up the local Fabric runtime, it's time to install and instantiate your smart contract...

</details>

---

<details>
<summary><b>5. Install the smart contract</b></summary>

In a real network, each of the organizations that will be endorsing transactions will install the smart contract on their peers, then the contract will be instantiated on the channel. Our basic local Fabric runtime only has a single organization (`Org1`) with a single peer (`peer0.org1.example.com`) and a single channel (`mychannel`).

So, we only have to install the contract on that single peer, then we will be able to instantiate it in `mychannel`.
To do this...

1. In the `Fabric Environments` panel, look for `+ Install` (it's under Smart Contracts > Installed) and click it.

2. You'll be asked to choose a package to install. Pick `demoContract@0.0.1`.

You should see `demoContract@0.0.1` appear under the Smart Contracts > Installed list.

> Command Palette alternative: `Install Smart Contract`

That's it - job done! Next up, we'll instantiate the smart contract...

</details>

---

<details>
<summary><b>6. Instantiate the smart contract</b></summary>

Installed smart contracts aren't ready to be invoked by client applications yet: we need a shared instance of the contract that all organizations in the network can use. In our simplified local dev network with just one organization, this is a bit of a moot point! As you'll see in later tutorials though, when multiple organizations are involved, they must individually __install__ the same contract on their respective __peers__ before the group can __instantiate__ on their shared __channel__. So, it's useful to be thinking about this deployment as a two-stage process even at this early stage: it'll save you some surprises later!

For now though, we've got our contract installed on all (one) of the peers that participate in `mychannel` so we can go ahead and instantiate.

1. In the `Fabric Environments` panel, look for `+ Instantiate` (it's under Smart Contracts > Instantiated) and click it.

2. You'll be asked to choose a smart contract to instantiate. Pick `demoContract@0.0.1`.

3. You'll be asked what function to call. If you wanted to use a specific function as part of your instantiate, you could enter something here.  We'll see that happen in future tutorials, but for now just hit `Enter` to skip this step.

4. You'll be asked if you want to provide a private data configuration file. For this tutorial just click `No`, in future tutorials we will explain more about this.

Instantiation can take a while longer than install - watch out for the success message and `demoContract@0.0.1` appearing in the Smart Contracts > Instantiated list to confirm it's worked!

> Command Palette alternative: `Instantiate Smart Contract`

</details>

---

<details>
<summary><b>7. Submit and evaluate transactions</b></summary>

Fabric gateways are connections to peers participating in Hyperledger Fabric networks, which can be used by client applications to submit transactions. When you started the local runtime in `LOCAL FABRIC OPS`, a gateway was automatically created for you also. You'll find it under `FABRIC GATEWAYS`, and it's called `Local Fabric`.

To _use_ a gateway, you also need an identity valid for transacting on the network in question. Again, for the local Fabric runtime, this has already been set up for you!  Observe that under `FABRIC WALLETS` there is a wallet called `Local Fabric Wallet  `, which contains an ID called `admin`. If you hover your mouse over `Local Fabric` in the `FABRIC GATEWAYS` panel, you will see that it tells you "Associated wallet: Local Fabric Wallet".

So, you've got a Gateway, and an associated wallet with a single identity in it - this means the Gateway is ready to be used!

1. Click on `Local Fabric` (under `FABRIC GATEWAYS`) to connect via this gateway. You will now see `Connected via gateway: Local Fabric, Using ID: admin` and a collapsed section labelled  `Channels`.

2. Expand `Channels`, then expand `mychannel` and `demoContract@0.0.1`. You will see a list of all the transactions that were defined in your smart contract.

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

Completed all the steps? Congratulations, you now know the key steps in the workflow of local smart contract development. You've generated a skeleton contract, deployed it locally, and submitted/evaluated transactions using it.

If you wish to spend some more time locally developing your own smart contracts, our Samples (accessed from the extension's homepage) can help you explore development concepts. If you're iterating a lot on your code, you should checkout our __Debug__ tutorial, it's _very_ useful for developers!

There's no need to worry about those concepts yet if you don't want to though: `demoContract@0.0.1` is perfect for carrying on with this tutorial series!

<a href='./cloud-setup.md'><h2 align='right'><b> Next: Create a cloud blockchain deployment ➔ </h2></b></a>