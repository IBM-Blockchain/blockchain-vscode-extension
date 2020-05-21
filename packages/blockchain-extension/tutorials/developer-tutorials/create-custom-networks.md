## **Create and use a custom Fabric network**
`30-45 mins`

This tutorial will teach you to create a new Fabric network on your local machine using Ansible playbooks.

Networks you create in this way will not replace the pre-configured local Fabric networks such as `1 Org Local Fabric`.

## Learning Objectives

* Learn how Ansible can be used to create Fabric networks
* Discover example Ansible playbooks to get you started
* Use Ansible to run your own playbook
* Import your Ansible generated environment, gateways and wallets to interact with your network from VS Code

---
<details>
<summary><b>1. Installing prerequisites, Ansible and the IBM Blockchain Platform Manager role</b></summary>

The IBM Blockchain platform extension does not run Ansible playbooks itself, so you’ll need to install some external pre-requisites to run a playbook before you can import the custom network.

1. Install [Python 3.7+](https://www.python.org/downloads/)
>Note: This is required when installing Ansible using some methods, as well the IBM Blockchain Platform Manager role.

2. Install [Ansible 2.8+](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#installing-ansible)
3. Install the [Ansible VS Code extension](https://marketplace.visualstudio.com/items?itemName=vscoss.vscode-ansible
)
4. Install the [role requirements](https://github.com/IBM-Blockchain/ansible-role-blockchain-platform-manager#requirements)
 > Note: you’ll already have the Python and Ansible requirements if you followed the steps above, but make sure you install the rest!
5. Install the IBM Blockchain Platform Manager Ansible role by running the following command in your terminal:
    > `ansible-galaxy install ibm.blockchain_platform_manager`

You should see output such as:

```
admin@admins-mbp one-org-network % ansible-galaxy install ibm.blockchain_platform_manager

- downloading role 'blockchain_platform_manager', owned by ibm

- downloading role from https://github.com/IBM-Blockchain/ansible-role-blockchain-platform-manager/archive/0.0.16.tar.gz

- extracting ibm.blockchain_platform_manager to /Users/admin/.ansible/roles/ibm.blockchain_platform_manager

- ibm.blockchain_platform_manager (0.0.16) was installed successfully
```

> Note: More information on the IBM Blockchain Platform Manager role can be found here - [https://galaxy.ansible.com/ibm/blockchain_platform_manager](https://galaxy.ansible.com/ibm/blockchain_platform_manager)


<b>Everthing has been installed, the hard part is over!</b>


</details>

---

<details>
<summary><b>2. Find and customize example playbooks</b></summary>

Two example playbooks can be found here - [https://github.com/IBM-Blockchain/ansible-examples](https://github.com/IBM-Blockchain/ansible-examples).

**We recommend using Git to clone this samples repo locally!**

They include a 1 organisation and 2 organisation Ansible playbook. 

Ansible playbooks can deployed to different types of infrastructure including:
- Locally using Docker (default)
- IBM Blockchain Platform on IBM Cloud
- IBM Blockchain Platform software

For more information on how they can be customized, please check their READMEs.


</details>

---

<details>
<summary><b>3. Running a playbook</b></summary>

Assuming you've have cloned the [ansible-examples](https://github.com/IBM-Blockchain/ansible-examples), you can run the following steps.

If you have created your own Ansible playbook, you can follow similar steps - changing paths and names where necessary.

1. Open the `playbook.yml` file in VS Code
> This can be found in `ansible-examples/one-org-network`
2. In the file Explorer, right-click on the `playbook.yml` and select `Run Ansible Playbook in Local Ansible`
3. This will take a few minutes and should create some Docker containers, assuming you haven't changed the infrastructure target. These Docker containers can be displayed by running `docker ps` from your terminal.

> Alternatively, you can run the `Run Ansible Playbook in Local Ansible` command from the Command Palette.

The playbook can also be ran from a terminal within the `one-org-network` directory, using the command:
> `ansible-playbook playbook.yml`


You can also teardown your Ansible generated Fabric network and remove all associated files from a terminal within the `one-org-network` directory, using the command:
>`ansible-playbook --extra-vars state=absent playbook.yml`

</details>

---

<details>
<summary><b>4. Importing your environment, gateways and wallets for your network</b></summary>

Once your Ansible playbook has successfully ran, `nodes`, `gateways` and `wallets` directories should have been created.

These contain all of the files needed to import your network and start interacting with it!

1. Hover over the `Fabric Environments` panel on the left hand side of the screen and select the +.
2. You will then be asked to `Select a method to add an environment`. Choose the `Add an Ansible-created network` option.
3. You will then be prompted to select a directory to import.
> If you have ran the the `one-org-network` playbook, you should select this directory.
4. Give your network a name e.g. `ansibleNetwork`. Whatever you find easy to identify! Then press `Enter` which will import your Ansible network.
5. If your Ansible Fabric network is running, you should see your new environment imported and any gateways and wallets.
> Note: If you don't see any gateways and wallets, it could be because your Fabric network hasn't been started.
>
> Once you have run your Ansible playbook and your network has started, you can refresh the `Fabric Gateways` and `Fabric Wallets` panels to see your gateways and wallets.

6. If your `one-org-network` generated Ansible Fabric network is running, you will see a gateway `ansibleNetwork > Org1 gateway` and wallet `ansibleNetwork > Org1`.
>

</details>

---

Completed all the steps? Congratulations, you now know how to create and use playbooks!
You've generated environments, gateways and wallets which you can import into the IBM Blockchain Platform extension to interact with your custom network.