# IBM Blockchain Platform development environment for Kubernetes

:warning: :warning: :warning:

**This directory contains sample code that is not a part of the IBM Blockchain Platform offering from IBM. This sample code may be updated or removed at any time. No official support for this sample code is provided by IBM, and any IBM support tickets regarding this sample code will be closed.**

**If you do find an issue with this sample code, please raise it as an issue against this GitHub repository. We would also welcome any feedback that you may have on this sample code.**

:warning: :warning: :warning:

The IBM Blockchain Platform extension for Visual Studio Code helps developers to create, test and debug smart contracts, connect to Hyperledger Fabric environments, and build applications that transact on your blockchain network.

This directory contains sample Kubernetes configuration that can be used to deploy a Docker image containing Visual Studio Code and the IBM Blockchain Platform extension, along with all of the required software for developing smart contracts in Go, Java, JavaScript, and TypeScript.

When using this Docker image, Visual Studio Code and the IBM Blockchain Platform extension can be accessed from any web browser.

This Docker image makes use of the [code-server](https://github.com/cdr/code-server) project developed by [Coder](https://coder.com/).

## Building the Docker image

Follow the steps [here](../docker/README.md) to build the Docker image used by this sample Kubernetes configuration. You must publish the Docker image to a Docker container registry that is accessible to your Kubernetes cluster, and you must provide Kubernetes with any appropriate Docker registry secrets.

## Deploying the Docker image to Kubernetes

These steps and files are based on a successful deployment to the IBM Cloud Kubernetes Service. You may need to update these files for other Kubernetes services, such as the Azure Kubernetes Service.

First, ensure that you have built the Docker image following the above steps. No publicly available Docker image is available from any Docker container registries.

Next, view the file `persistentVolumeClaim.yaml`. You may wish to edit this file if you want to change the storage class, or the size of the persistent volume. This persistent volume is used to store all configuration data and the users smart contract code.

Next, edit the file `deployment.yaml`. You will need to replace the Docker image name `ibmblockchain/vscode:latest` with the Docker image name you built and published to a Docker container registry. You may also wish to adjust the memory and CPU limits.

Next, edit the file `ingress.yaml`. You will need to replace the host name `vscode.example.org` with a valid host name mapped to your Kubernetes cluster. You will need to replace the TLS secret `vscode-tls-secret` with the name of a valid TLS secret defined on your Kubernetes cluster.

Next, apply all of the configuration to your Kubernetes cluster:

    kubectl apply -f persistentVolumeClaim.yaml,deployment.yaml,service.yaml,ingress.yaml

Next, ensure that the deployment has started correctly:

    kubectl get deployments

Finally, you can access Visual Studio Code from a web browser using the following URL: https://vscode.example.org, where `vscode.example.org` is the host name you specified in your ingress configuration above.