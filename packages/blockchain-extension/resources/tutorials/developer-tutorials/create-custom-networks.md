This tutorial will teach you to create a new Fabric network on your local machine using Microfab.

Networks you create in this way will not replace the pre-configured local Fabric networks such as `1 Org Local Fabric`.

**Learning Objectives**

* Learn how Microfab can be used to create Fabric networks
* Discover example Microfab configurations to get you started
* Import your Microfab generated network

---

<details>
<summary><b>1. Create a configuration</b></summary>

Information on the different configuration settings can be found here - [https://github.com/IBM-Blockchain/microfab](https://github.com/IBM-Blockchain/microfab).

A simple configuration is as follows:

```
export MICROFAB_CONFIG='{
    "port": 8080,
    "endorsing_organizations":[
        {
            "name": "Org1"
        }
    ],
    "channels":[
        {
            "name": "mychannel",
            "endorsing_organizations":[
                "Org1"
            ]
        }
    ]
}'
```

This configuration creates a network with one channel. The channel 'mychannel' has V2_0 capabilities which a single organisation 'Org1' is a member of.


Another example configuration is as follows:

```
export MICROFAB_CONFIG='{
    "port": 8080,
    "endorsing_organizations":[
        {
            "name": "Org1"
        },
        {
            "name": "Org2"
        },
        {
            "name": "Org3"
        }
    ],
    "channels":[
        {
            "name": "channel1",
            "endorsing_organizations":[
                "Org1",
                "Org2"
            ]
        },
        {
            "name": "channel2",
            "endorsing_organizations":[
                "Org2",
                "Org3"
            ],
            "capability_level": "V1_4_2"
        }
    ]
}'
```

This configuration creates a network with two channels. The first channel 'channel1' has V2_0 capabilities which two organisations 'Org1' and 'Org2' are a member of.
The second channel 'channel2' has V1_4_2 capabilities which two organisations 'Org2' and 'Org3' are a member of.

**Note: If you are using Windows, change `export` to `SET` to set the variable.**
</details>

---

<details>
<summary><b>2. Run Microfab</b></summary>

Once you have exported/set your MICROFAB_CONFIG variable, to run Microfab you need to run the following command:

`docker run -e MICROFAB_CONFIG -p 8080:8080 ibmcom/ibp-microfab`

This will start your Fabric network on port 8080. To change this port, refer to the [documentation](https://github.com/IBM-Blockchain/microfab).

</details>

---

<details>
<summary><b>3. Importing your network</b></summary>

1. Hover over the `Fabric Environments` panel on the left hand side of the screen and select the +.
2. You will then be asked to `Select a method to add an environment`. Choose the `Add a Microfab network` option.
3. You will then be prompted to select the URL of the Microfab network.
> If you have used the previous configuration, this will be the default `http://console.127-0-0-1.nip.io:8080` URL.
4. Give your network a name e.g. `MyMicrofabNetwork`. Whatever you find easy to identify! Then press `Enter` which will import your Microfab network.
5. If your Microfab Fabric network is running, you should see your new environment imported and any gateways and wallets.
> Note: If you don't see any gateways and wallets, it could be because your Fabric network hasn't been started.
>
> Once you have started your Microfab network, you can refresh the `Fabric Gateways` and `Fabric Wallets` panels to see your gateways and wallets.


</details>

---

Completed all the steps? Congratulations, you now know how to create Microfab networks and import them into VS Code!