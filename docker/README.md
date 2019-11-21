# IBM Blockchain Platform development environment for Docker

:warning: :warning: :warning:

**This directory contains sample code that is not a part of the IBM Blockchain Platform offering from IBM. This sample code may be updated or removed at any time. No official support for this sample code is provided by IBM, and any IBM support tickets regarding this sample code will be closed.**

**If you do find an issue with this sample code, please raise it as an issue against this GitHub repository. We would also welcome any feedback that you may have on this sample code.**

:warning: :warning: :warning:

The IBM Blockchain Platform extension for Visual Studio Code helps developers to create, test and debug smart contracts, connect to Hyperledger Fabric environments, and build applications that transact on your blockchain network.

This directory contains a sample Dockerfile and build scripts that can be used to build a Docker image containing Visual Studio Code and the IBM Blockchain Platform extension, along with all of the required software for developing smart contracts in Go, Java, JavaScript, and TypeScript.

When using this Docker image, Visual Studio Code and the IBM Blockchain Platform extension can be accessed from any web browser.

This Docker image makes use of the [code-server](https://github.com/cdr/code-server) project developed by [Coder](https://coder.com/).

## Building the Docker image

### Requirements

In order to build this Docker image, you must have the following software installed:

- Node.js 10.16+
  - https://nodejs.org/en/download/
- Docker 19.03+
- `jq`
  - https://stedolan.github.io/jq/download/

### Steps

First, clone this repository from GitHub:

    git clone https://github.com/IBM-Blockchain/blockchain-vscode-extension.git

Then, change into the cloned repository:

    cd blockchain-vscode-extension

Then, run the build script for this Docker image:

    bash docker/build.sh

Then, tag the Docker image appropriately for your username or organization, for example:

    docker tag ibmblockchain/vscode:latest fredbloggs/ibmblockchain-vscode:latest

Finally, if you wish to run this Docker image elsewhere, for example in Kubernetes, or on the cloud, push the Docker image to your Docker container registry (for example, Docker Hub):

    docker push fredbloggs/ibmblockchain-vscode:latest

## Running the Docker image

First, ensure that you have built the Docker image following the above steps. No publicly available Docker image is available from any Docker container registries.

Next, run the Docker image by using the following command:

    docker run -d --name vscode -p 8080:8080 -v /path/to/storage:/home/vscode fredbloggs/ibmblockchain-vscode:latest

Note: you will need to update this command for your local machine to reflect port availability and storage locations.

Finally, you can access Visual Studio Code from a web browser using the following URL: http://localhost:8080