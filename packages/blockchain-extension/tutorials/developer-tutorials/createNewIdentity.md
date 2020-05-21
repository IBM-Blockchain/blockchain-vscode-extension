## **Create a new identity**
`5-10 mins`


## Learning Objectives

* Create a new identity using Local Fabric CA

> Note: This tutorial assumes you have a basic understanding of the VSCode extension and have followed the <a href='../new-tutorials/basic-tutorials/a1.md'> Basic Tutorials</a> series.

In 'Tutorial A4: Invoking a smart contract from VS Code', we used a pre-set identity (`org1Admin`) to connect to the 1 Org Local Fabric gateway and submit/evaluate transactions. In this tutorial, we will learn how to create _our own_ identity.

***Why use multiple identities?*** 

Having multiple identities enrolled with the 1 Org Local Fabric CA (Certificate Authority) allows you to represent different participants in a blockchain network. 

For the purpose of this tutorial, we’ll use a fictional example of a manufacturer who creates cars and a customer (who can buy cars but should not be manufacturing them!). We will be referring to the two identities Jack (the customer) and Arium (the manufacturer). Since they are two seperate identities, they may be permitted to submit different transactions in a smart contract.

---
<details>
<summary><b>1. Create a new identity</b></summary>

1. If the 1 Org Local Fabric isn't running, under the `FABRIC ENVIRONMENTS` panel, click on `1 Org Local Fabric  ○ (click to start)` to start the local Fabric and connect to it. Once this is done, look for `Org1CA` (it's under Nodes), right click it and choose `Create Identity (register and enroll)`. 

> Command Palette alternative: `Create Identity (register and enroll)`

2. You will be asked to provide a name for your identity. For the purpose of this tutorial, we will call our identity `Jack` and select `No` when asked to add attributes (These will be covered in a later tutorial).

3. Upon submitting your request, you should see a confirmation message at the bottom right of the screen confirming that your identity `Jack` has been created. The newly created identity should also appear in the `Fabric Wallets` panel under `1 Org Local Fabric > Org1`. 

4. To connect to the 1 Org Local Fabric gateway using this identity, you simply click `1 Org Local Fabric > Org1` under the Fabric Gateways panel and select the identity you wish to connect with (Jack in our case).

__*Note*__: If you are connected to the gateway already using the `admin` identity, you will need to disconnect from the gateway before you can reconnect with another identity. 

</details>

Congratulations, you've completed this tutorial! You've successfully created your very own identity - Jack. In the next tutorial, you will learn how to create another identity (but this time, with attributes!).

<a href='./createNewIdentityAttributes.md'><h3 align='right'><b> Next: Create an identity with attributes ➔ </h3></b></a>