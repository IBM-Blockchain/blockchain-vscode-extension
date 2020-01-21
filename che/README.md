# IBM Blockchain Platform development environment for Eclipse Che

:warning: :warning: :warning:

**This directory contains sample code that is not a part of the IBM Blockchain Platform offering from IBM. This sample code may be updated or removed at any time. No official support for this sample code is provided by IBM, and any IBM support tickets regarding this sample code will be closed.**

**If you do find an issue with this sample code, please raise it as an issue against this GitHub repository. We would also welcome any feedback that you may have on this sample code.**

:warning: :warning: :warning:

The IBM Blockchain Platform extension for Visual Studio Code helps developers to create, test and debug smart contracts, connect to Hyperledger Fabric environments, and build applications that transact on your blockchain network.

Eclipse Che (https://www.eclipse.org/che/) is a Kubernetes native IDE for developer teams, where developers can create and share developer workspaces within teams that remove the requirement to set up a local development environment.

This directory contains instructions on how to use the IBM Blockchain Platform extension for Visual Studio Code within an Eclipse Che developer workspace.

## Eclipse Che workspace configuration

In Eclipse Che, you can define a developer workspace using a [devfile](https://redhat-developer.github.io/devfile/). The devfile contains a list of components, projects, and commands that make up the developer workspace.

The IBM Blockchain Platform extension can be referenced in a devfile as per any other Eclipse Che plugin or Visual Studio Code extension. However, instead of using the Visual Studio Code marketplace, you must directly reference a special build of the IBM Blockchain Platform extension for Visual Studio Code that has been built to run within the Eclipse Che environment.

### Requirements

In order to use the IBM Blockchain Platform extension with Eclipse Che, you must have Eclipse Che 7+, and a solid understanding of Eclipse Che and the usage of devfiles to create developer workspaces.

If you need to quickly get started with Eclipse Che, follow one of the quick start guides available here: https://www.eclipse.org/che/docs/che-7/che-quick-starts/

You can also use Red Hat CodeReady Workspaces, a commercial offering of Eclipse Che from Red Hat that is included in Red Hat OpenShift: https://developers.redhat.com/products/codeready-workspaces/overview

### Steps

First, find the latest release on GitHub: https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases

Then, expand the **Assets** section, and copy the URL (right click, copy link address) to the Eclipse Che YAML file. The name of this file will be `ibm-blockchain-platform-che-x.y.z.yaml`, and the URL will be similar to: `https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases/download/v1.0.18/ibm-blockchain-platform-che-1.0.18.yaml`

Then, add the IBM Blockchain Platform extension to your devfile as an additional component:

```
components:
  - type: chePlugin
    reference: https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases/download/vx.y.z/ibm-blockchain-platform-che-x.y.z.yaml
    alias: ibm-blockchain-platform
```

The reference URL should be updated to the URL of the Eclipse Che YAML file that you discovered in the previous step.

Finally, start an instance of your developer workspace by passing the devfile into Eclipse Che using either the UI or the `chectl` CLI.

A complete, minimal devfile example is as follows:

```
---
apiVersion: 1.0.0
metadata:
  name: ibm-blockchain-platform-example
components:
  - type: chePlugin
    reference: >-
      https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases/download/v1.0.18/ibm-blockchain-platform-che-1.0.18.yaml
    alias: ibm-blockchain-platform
```