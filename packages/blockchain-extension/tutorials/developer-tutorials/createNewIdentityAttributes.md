## **Create a new identity with attributes**
`15-20 mins`

## Learning Objectives

* Create our smart contract
* Create a new identity with attributes using 1 Org Local Fabric CA.
* Use the newly created identity and implement attribute-based access control.
    * Package the smart contract
    * Install the smart contract
    * Instantiate the smart contract

> Note: This tutorial assumes you have created the `Jack` identity by following the <a href='./createNewIdentity.md'>previous tutorial </a>.

In the previous tutorial (creating a new identity), we learnt how to create our own identities without giving them any attributes. In this tutorial, we will be learning how to create an identity with attributes.

***Why assign attributes to identities?***

When creating an identity, you can assign attributes to allow attribute-based access control. A transaction function can contain logic that will cause a change in behaviour, depending on the attributes used to submit the transaction.

As an example, suppose we have a smart contract which allows participants to record the cars owned by a company on a blockchain. We may allow participants to add cars to the blockchain by submitting a `createCar` transaction. Now, this would be fine for `Arium` because it is a manufacturer, but since `Jack` is an individual, if he tries to submit a `createCar` transaction, we should stop him! Here’s how you would register and enroll an identity for `Arium` from the 1 Org Local Fabric CA with suitable attributes…

---

<details>
<summary><b>1. Create a new identity with attributes</b></summary>

1. If the 1 Org Local Fabric isn't running, under the `FABRIC ENVIRONMENTS` panel, click on `1 Org Local Fabric  ○ (click to start)` to start the local Fabric and connect to it. Once this is done, look for `Org1CA` (it's under Nodes), right click it and choose `Create Identity (register and enroll)`. 

> Command Palette alternative: `Create Identity (register and enroll)`

2. You will be asked to provide a name for your identity. For the purpose of this tutorial, we will call our identity `Arium` and select `Yes` when asked to add attributes. We will give Arium the attributes `[{"name": "manufacturer", "value": "true", "ecert":true}]`

>`ecert` stands for Enrollement Certificate. When set to true, it writes the attributes into the identity's certificate. This allows a transaction to read the attributes of the identity invoking it and make branching decisions, for example whether or not this user is allowed to invoke it. `"ecert":true` is required to implement attribute-based access control.

3. Upon submitting your request, you should see a confirmation message at the bottom right of the screen confirming that your identity `Arium` has been created with attributes `[{"name": "manufacturer", "value": "true", "ecert":true}]`. The newly created identity should also appear in the `Fabric Wallets` panel under `1 Org Local Fabric > Org1`. 
</details>

---

<details>
<summary><b>2. Create our smart contract</b></summary>


1. In the left sidebar, click on the __IBM Blockchain Platform__ icon (it looks like a square, and will probably be at the bottom of the set of icons if this was the latest extension you installed!)

2. Mouse-over the `SMART CONTRACTS` panel, click the `...` menu, and select `Create New Project` from the dropdown.

> Command Palette alternative: `Create New Project`

3. For this tutorial, choose the `Default Contract` option.

4. You will now be asked to choose a smart contract language, choose `Typescript`.

5. The extension will ask you if you want to name the asset in the generated contract. Next the extension will ask you for an asset name, for this tutorial enter `Car`.

6. Choose a location to save the project.  Click `Browse`, then click `New Folder`, and give the project a name, for example `carContract`.

> __Pro Tip:__ Avoid using spaces when naming the project!

7. Click `Create` and then select the new folder you just created and click `Save`.

8. Finally you will be asked how you want to open the project, choose `Add to workspace` from the list of options.

</details>

---

<details>
<summary><b>3. Update our smart contract</b></summary>

Now that we've created our very own identities, we can implement attribute-based access control.

1. Click the `Explorer` icon in the left sidebar (it will probably be at the top, and looks like a stack of 2 file icons) and navigate to the `car-contract.ts` file in the `src` folder under the contract directory.

2. To prevent Jack from carrying out the `createCar` transaction, we need to tweak the generated smart contract slightly. We can replace the function with the following: 

```
public async createCar(ctx: Context, carId: string, value: string): Promise<void> {
    const identity: ClientIdentity = ctx.clientIdentity;
    // Check if the identity has the 'manufacturer' attribute set to 'true'
    const checkAttr: boolean = identity.assertAttributeValue('manufacturer', 'true');
    if (checkAttr) {
        const exists = await this.carExists(ctx, carId);
        if (exists) {
            throw new Error(`The car ${carId} already exists`);
        }
        const car = new Car();
        car.value = value;
        const buffer = Buffer.from(JSON.stringify(car));
        await ctx.stub.putState(carId, buffer);
    } else {
        throw new Error('You must be a manufacturer to carry out this transaction!');
    }
}
```
3. You will need to import `ClientIdentity` by adding the following line at the top of the file (along with the other imports):
```
import { ClientIdentity } from 'fabric-shim';
```

***Save*** the changes.

The above simply checks if the identity trying to access the `createCar()` function has the attribute `manufacturer` set to `true`. If it does, allow the transaction to be executed. If the identity does not have the attribute `manufacturer` (or it isn't set to true), do not let the identity carry out the transaction and show an error message.

> Alternatively, you could use the <a href='https://hyperledger.github.io/fabric-chaincode-node/release-1.4/api/fabric-contract-api.Contract.html#beforeTransaction__anchor'> beforeTransaction()</a> function. This function could be used to seperate your business logic from your permissions.

</details>

---

<details>
<summary><b>4. Package the smart contract</b></summary>

1. In the left sidebar, click on the __IBM Blockchain Platform__ icon.

2. Mouse-over the `SMART CONTRACTS` panel, click the `...` menu, and select `Package Open Project` from the dropdown.
 
> Command Palette alternative: `Package Open Project`

3. You should see a new package on the list, `carContract@0.0.1`, if everything went well.

</details>

---

<details>
<summary><b>5. Install the smart contract</b></summary>

1. In the `Fabric Environments` panel, look for `+ Install` (it's under Smart Contracts > Installed) and click it.

2. You'll be asked to choose a package to install. Pick `carContract@0.0.1`.

You should see `carContract@0.0.1` appear under the Smart Contracts > Installed list.

> Command Palette alternative: `Install Smart Contract`

</details>

---

<details>
<summary><b>6. Instantiate the smart contract</b></summary>

1. In the `Fabric Environments` panel, look for `+ Instantiate` (it's under Smart Contracts > Instantiated) and click it.

2. You'll be asked to choose a smart contract to instantiate. Pick `carContract@0.0.1`.

3. You'll be asked what function to call. If you wanted to use a specific function as part of your instantiate, you could enter something here.  We'll see that happen in future tutorials, but for now just hit `Enter` to skip this step.

4. You'll be asked if you want to provide a private data configuration file. For this tutorial just click `No`, in future tutorials we will explain more about this.

Instantiation will take a while longer than install - watch out for the success message and `carContract@0.0.1` appearing in the Smart Contracts > Instantiated list to confirm it's worked!

> Command Palette alternative: `Instantiate Smart Contract`
</details>

---

<details>
<summary><b>7. Submit transaction without permission</b> </summary>

We can now test out the attribute-based access control that we implemented earlier. To do, we will first demonstrate what happens when an identity with incorrect attributes tries to submit the `createCar` transaction.

1. To test that attribute-based access control works, we can connect to the gateway by pressing `1 Org Local Fabric > Org1` under the `FABRIC GATEWAYS` panel. You will now be asked which identity you wish to connect with - choose `Jack` (created in our previous tutorial). 
> Command Palette alternative: `Connect Via Gateway` 

2. To execute a transaction, navigate to `mychannel`, `carContract@0.0.1` under the `FABRIC GATEWAYS` panel. Here, you will see a list of all the transactions you can carry out. 

3. For the scope of this tutorial, we will be submitting the `createCar` transaction (right-click on the transaction and `Submit Transaction`). You will now be asked to provide arguments for the transaction. For this tutorial, we will pass the following arguments: `["001", "Model X"]` to the `createCar` transaction. When asked for `transient data`, just press `Enter` to continue (transient data will be covered in a later tutorial).

4. The above will result in the error message `Error: You must be a manufacturer to carry out this transaction!` because Jack is not a manufacturer!
</details>

---

<details>
<summary><b>8. Submit transaction with permission </b></summary>

Now we will show how an identity with the correct attributes can submit the `createCar` transaction
1. Firstly, disconnect from the gateway (by hovering on the `FABRIC GATEWAYS` panel and pressing the button that looks like an exit symbol). 

2. To reconnect with a different identity, click `1 Org Local Fabric > Org1` in the `FABRIC GATEWAYS` panel. You will then be asked which identity to connect with, choose `Arium`
> Command Palette alternative: `Connect Via Gateway`

3. Next, submit the `createCar` transaction again by navigating to `mychannel`, `carContract@0.0.1` on the `FABRIC GATEWAYS` panel.

4. When asked for the arguments for the transaction, enter the same arguments as before and hit `Enter` when asked for `transient data`. You should now see the message `Successfully submitted transaction` confirming that the car (Model X) has been created.

</details>

---

You have successfully created an identity with attributes and learnt how to implement attribute-based access control.