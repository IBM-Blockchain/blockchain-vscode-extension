## **Debug a smart contract**
`30-40 mins`

Learn how to iteratively develop and test out a smart contract using the VS Code debug tools.


## Learning Objectives

* Start a debug session
* Use the VS Code debug toolbar
* Make changes to a contract while debugging
* Debug a transaction function called on upgrade

---
<details>
<summary><b>1. Create a new smart contract project</b></summary>

The extension can generate a smart contract skeleton in your chosen Hyperledger Fabric supported programming language. This means you start with a basic but useful smart contract rather than a blank-sheet!

For the purposes of this tutorial, we'll use TypeScript as the example language.

> In VS Code, every command can be executed from the Command Palette (press `Ctrl+Shift+P`, or `Cmd+Shift+P` on MacOS). All of this extension's commands start with `IBM Blockchain Platform:`. In the tutorial steps, we'll explain where to click in the UI, but look out for comment-boxes like this one if you want to know the Command Palette alternatives.

1. In the left sidebar, click on the __IBM Blockchain Platform__ icon (it looks like a square, and will probably be at the bottom of the set of icons if this was the latest extension you installed!)

2. Mouse-over the `SMART CONTRACT PACKAGES` panel, click the `...` menu, and select `Create Smart Contract Project` from the dropdown.

> Command Palette alternative: `Create Smart Contract Project`

3. Choose a smart contract language. JavaScript, TypeScript, Java and Go are all available. For the purpose of this tutorial, please choose `TypeScript`.

4. The extension will ask you if you want to name the asset in the generated contract. For this tutorial we’ll stick with the default of MyAsset.

5. Choose a location to save the project.  Click `Browse`, then click `New Folder`, and name the project what you want e.g. `demoContract`.

> __Pro Tip:__ Avoid using spaces when naming the project!

6. Click `Create` and then select the new folder you just created and click `Save`.

7. Select `Add to workspace` from the list of options.

8. The extension will generate you a skeleton contract based on your selected language and asset name. Once it's done, you can navigate to the __Explorer__ view (most-likely the top icon in the left sidebar, which looks like a "document" icon) and open the `src/my-asset-contract.ts` file to see your smart contract code scaffold.

9. Add a new function with the following code. This function creates an asset and added it to the world state.

```
    @Transaction()
    public async setup(ctx: Context): Promise<void> {
        const myAsset = new MyAsset();
        myAsset.value = 'a nice asset';
        const buffer = Buffer.from(JSON.stringify(myAsset));
        await ctx.stub.putState('001', buffer);
    }
```  

10. Save the file.

</details>

---

<details>
<summary><b>2. Start the VS Code debugger</b></summary>

Normal workflow is to package, then install, then instantiate a smart contract. This usual flow results in the smart contract running in a docker container on the peer(s)… But to debug we do things a little differently! We need to create a situation whereby the smart contract is running in the VS Code debugger rather than on the peer. Fortunately, this extension makes that easy to do: let’s learn how!

1. In the left sidebar, click on the __IBM Blockchain Platform__ icon, on the `Fabric Environments` panel, check that `Local Fabric` is started, if it's stopped click on it to start.

2. In the left sidebar, click on the __Debug__ icon (it looks like a circle with a bug in it)

3. On the debug panel, make sure “Debug Smart Contract” is selected from the dropdown, then click the __Start Debugging__ icon (it looks like a green triangle) this will start a debug session.

</details>

---

<details>
<summary><b>3. Instantiate the smart contract</b></summary>

The debug session has started and will automatically run the command to instantiate the smart contract.

1. You'll be asked what function to call. Type `setup`. This will run the setup transaction when the smart contract is being instantiated.

2. You'll be asked to provide arguments for the function. Just hit `Enter` as the transaction doesn't have any arguments.

3. You'll be asked if you want to provide a private data configuration file. For this tutorial just click `No`, in future tutorials we will explain more about this.

</details>

---

<details>
<summary><b>4. Submit a transaction</b></summary>

The smart contract has been instantiated so we can set break points and step through a transaction function.

1. In the smart contract file, find the `createMyAsset` function and click just to the left of the line numbers, on the first line of the transaction function. This will set a breakpoint in the code.

2. In the left sidebar , click the __Debug__ icon.

3. Click on the Debug Command List icon on the debug toolbar. It’s represented by the IBM Blockchain Platform logo, a white square on a blue circle, and will probably be the furthest-right button on the toolbar.

4. Choose `Submit transaction` from the list.

5. You will be asked what function to call. Choose `createMyAsset`.

6. You will be asked to provide arguments for the transaction: try ["002", "a juicy delicious asset”]. You can hit enter to skip the next question about transient data, as we don’t need any for this transaction.

7. After submitting the transaction, the transaction execution should pause on the line you put the break point on. You can then press the __Step Over__ icon to step over each line of the transaction, or the __Play__ icon to execute the remaining lines of code in the transaction function.

</details>

---

<details>
<summary><b>5. Make changes to the smart contract</b></summary>

We now want to make some changes to the smart contract to add an extra property to the `createMyAsset` function.

1. Click on the __Stop__ icon on the debug toolbar.

2. Update the `createMyAsset` function to have the following code. This will take the `assetName` and `assetValue` parameters and combine them to be the `value` set on the asset.

```
    @Transaction()
    public async createMyAsset(ctx: Context, myAssetId: string, assetName: string, assetValue: string): Promise<void> {
        const exists = await this.myAssetExists(ctx, myAssetId);
        if (exists) {
            throw new Error(`The my asset ${myAssetId} already exists`);
        }
        const myAsset = new MyAsset();
        myAsset.value = assetName + ' ' + assetValue;
        const buffer = Buffer.from(JSON.stringify(myAsset));
        await ctx.stub.putState(myAssetId, buffer);
    }
```

3. Save the file.

4. On the debug panel click the __Start Debugging__ icon. On the debug panel. The debugger is smart enough to realise that we already instantiated the smart contract we’re working on, and since the contract is actually running in the debugger there’s no need to re-instantiate or upgrade the contract to test out our updated transaction. This is one of the ways in which debugging makes it faster to test out small updates to your code!

5. Click on the Debug Command List icon on the debug toolbar.

6. Choose `Submit transaction` from the list.

7. You will be asked what function to call. Choose `createMyAsset`.

8. You will be asked to provide arguments for the transaction: try `["002", "an asset", "a very nice asset"]`. You can hit enter to skip the next question about transient data, as we don’t need any for this transaction.

10. After submitting the transaction, the transaction execution should again pause on the line you put the break point on. This time when you step through you can see the transaction is executing with the new property added.

</details>

---

<details>
<summary><b>6. Debug a transaction function called on upgrade</b></summary>

When you make changes to a function that is called on upgrade you need to upgrade the smart contract to test it out. To make the VS Code call upgrade you need to change the version.

1. Click on the __Stop__ icon on the debug toolbar.

2. Update the `setup` transaction with the following code.

```
    @Transaction()
    public async setup(ctx: Context): Promise<void> {
        const myAsset = new MyAsset();
        myAsset.value = 'an asset created on upgrade';
        const buffer = Buffer.from(JSON.stringify(myAsset));
        await ctx.stub.putState('010', buffer);
    }
```
3. Save the file.

4. Add a breakpoint on the first line of the `setup` transaction function.

5. On the debug panel click the __Settings Cog__ icon. This will open up the `launch.json`. 

6. Update the file to be the following. This adds the property `CORE_CHAINCODE_ID_NAME` and sets it to be a different version from before.

```
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "fabric:node",
            "request": "launch",
            "name": "Debug Smart Contract",
            "preLaunchTask": "tsc: build - tsconfig.json",
            "outFiles": [
                "${workspaceFolder}/dist/**/*.js"
            ],
            "env": {
                "CORE_CHAINCODE_ID_NAME": "demoContract:0.0.2"
            }
        }
    ]
}
```

7. Save the file.

8. On the debug panel click the __Start Debugging__ icon. After the debugger starts the `upgrade` command will automatically be called.

9. You will be asked what function to call. Type `setup`.

10. You will be asked to provide arguments for the transaction. Just press enter as the transaction doesn't take any arguments.

11. You will be asked if you want to have a private data collection. Just press enter as you don't need to provide a private data collection.

8. This time execution will pause in the setup function. You can then step over each of the lines or click play to carry on executing the function.

</details>

---

Now you have completed this tutorial you know how to debug your smart contract and quickly make changes and test them out.

