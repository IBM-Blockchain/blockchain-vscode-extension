<!-- # TUTORIAL 2: Create a cloud blockchain deployment -->

## **Create a cloud blockchain deployment**
`50-60 mins`

After developing a smart contract against the local runtime, you'll need somewhere more permanent to deploy for further dev, proof of concept, or production use. IBM Blockchain Platform includes an offering on IBM Cloud for creating and operating a suitable runtime environment for such purposes. Its full name is "IBM Blockchain Platform on IBM Cloud", but for the sake of brevity we'll refer to it from here on out as "the cloud service". In this tutorial you will learn how to get a cloud environment set up using the cloud service.

### **Learning Objectives**

* Deploy and configure an instance of the cloud service
* Create a basic network on IBM Cloud

---
<details>
<summary><b>1. IBM Blockchain Platform on IBM Cloud</b></summary>

The cloud service comes with comprehensive documentation and tutorials on IBM Cloud. Here are some good starting points...

* (Optional) Learn about what the cloud service is with this overview: [About IBM Blockchain Platform on IBM Cloud](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-console-overview&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+about+IBM+Blockchain+Platform&cm_mmca1=000026VG&cm_mmca2=10008691)

* (Required) Get started using the cloud service: [Getting started with IBM Blockchain Platform on IBM Cloud](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-v2-deploy-iks&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+Getting+started&cm_mmca1=000026VG&cm_mmca2=10008691#ibp-v2-deploy-iks)

Follow the steps in the "Getting Started" link, and you will have your own instance on the cloud service, with an associated Kubernetes cluster where your created resources will run. Next, it's time to create some resources on IBM Cloud. 

</details>

---

<details>
<summary><b>2. Basic network setup</b></summary>

You should recognise some of the terms you're about to see in the cloud service (like "Organization", "Peer", "Channel" etc.) from the Local Fabric runtime provided with this VS Code extension. What you're doing in this step is creating a similar set of resources running on IBM Cloud (via the Kubernetes service) and managed by the cloud service's operational tooling console.

* (Required) Follow this tutorial to set up your cloud runtime: [Build a network tutorial](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-console-build-network&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+Build+a+network+tutorial&cm_mmca1=000026VG&cm_mmca2=10008691#ibp-console-build-network)

There's no need to follow the subsequent tutorials in the "sample network tutorial series": this initial configuration is perfectly sufficient for deploying your smart contracts and submitting some transactions.

</details>

---

Now you've got a basic network running on IBM Cloud, the next tutorial will teach you to deploy the packages you develop with this VS Code extension into the cloud service, and how to send transactions from your local machine to the cloud-hosted ledger.

> **Important:** Before moving on to the next tutorial, make sure you've got a simple blockchain network running on the cloud service by having followed both the [Getting started with IBM Blockchain Platform on IBM Cloud](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-v2-deploy-iks&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+Getting+started&cm_mmca1=000026VG&cm_mmca2=10008691#ibp-v2-deploy-iks) and [Build a network tutorial](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-console-build-network&cm_mmc=OSocial_Googleplus-_-Blockchain+and+Watson+Financial+Services_Blockchain-_-WW_WW-_-VS+code+link+-+Build+a+network+tutorial&cm_mmca1=000026VG&cm_mmca2=10008691#ibp-console-build-network) instructions!

<a href='./cloud-deploy.md'><h2 align='right'><b>Next: Deploying and transacting with IBM Cloud ➔</h2></a>