#!/usr/bin/env bash
#
# SPDX-License-Identifier: Apache-2.0
#
set -ex
ROOT=$(git rev-parse --show-toplevel)
cd ${ROOT}
cp -f ./packages/blockchain-extension/package.json ./packages/blockchain-extension/package.json.orig
trap "cd ${ROOT}; cp -f ./packages/blockchain-extension/package.json.orig ./packages/blockchain-extension/package.json; rm -f ./packages/blockchain-extension/package.json.orig" EXIT
npm install lerna
node ./node_modules/lerna/cli.js bootstrap
node ./node_modules/lerna/cli.js run compile
node ./node_modules/lerna/cli.js run createModule
cp ./README.md ./packages/blockchain-extension/README.md
cp ./CHANGELOG.md ./packages/blockchain-extension/CHANGELOG.md
cp -r ./media ./packages/blockchain-extension/media
cd ./packages/blockchain-extension
npm install vsce
npm install ../blockchain-ui/ibm-blockchain-platform-ui-*.tgz
npm install ../blockchain-common/ibm-blockchain-platform-common-*.tgz
npm install ../blockchain-wallet/ibm-blockchain-platform-wallet-*.tgz
npm install ../blockchain-environment-v1/ibm-blockchain-platform-environment-v1-*.tgz
npm install ../blockchain-gateway-v1/ibm-blockchain-platform-gateway-v1-*.tgz
npm run compile
npm run productionFlag
cat package.json.orig \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.ext.bypassPreReqs".default = true' \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.home.showOnStartup".default = false' \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.home.showOnNextActivation".default = true' \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.ext.enableLocalFabric".default = false' \
    | jq '(.actualActivationEvents.onView | map("onView:" + .)) as $onView |
          (.actualActivationEvents.onCommand | map("onCommand:" + .)) as $onCommand |
          (.actualActivationEvents.other) as $other |
          .activationEvents = $onView + $onCommand + $other' \
    > package.json
rm -rf ./node_modules/grpc/src/node/extension_binary/*
rm -rf ./node_modules/pkcs11js/build/Release/*
npm rebuild grpc --update-binary --runtime=node --target=10.0.0 --target_platform=linux --target_arch=x64 --target_libc=musl
npm rebuild grpc --update-binary --runtime=node --target=10.0.0 --target_platform=linux --target_arch=x64 --target_libc=glibc
npm run package
cd ${ROOT}
export VERSION=$(jq -r .version lerna.json)
mv ./packages/blockchain-extension/ibm-blockchain-platform-${VERSION}.vsix che/ibm-blockchain-platform-che-${VERSION}.vsix
cd che
cat > ibm-blockchain-platform-che-${VERSION}.yaml <<EOF
#
# SPDX-License-Identifier: Apache-2.0
#
---
apiVersion: v2
publisher: ibm
name: blockchain-platform
version: ${VERSION}
type: VS Code extension
displayName: IBM Blockchain Platform
title: IBM Blockchain Platform
description: End to end extension for Hyperledger Fabric developers. Develop and test your blockchain smart contracts and client applications on your local machine, and package your projects for deployment into IBM Blockchain Platform runtimes.
icon: https://raw.githubusercontent.com/IBM-Blockchain/blockchain-vscode-extension/master/packages/blockchain-extension/resources/logo.svg
repository: https://github.com/IBM-Blockchain/blockchain-vscode-extension
category: Other
firstPublicationDate: 2019-04-19
spec:
  extensions:
  - https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases/download/v${VERSION}/ibm-blockchain-platform-che-${VERSION}.vsix
  - https://open-vsx.org/api/vscode/markdown-language-features/1.39.1/file/vscode.markdown-language-features-1.39.1.vsix
  - https://github.com/IBM/vscode-ibmcloud-account/releases/download/v1.0.4/ibmcloud-account-1.0.4.vsix
EOF
# Copy the metadata file so that it can be referred to using the following URL pattern:
# https://github.com/IBM-Blockchain/blockchain-vscode-extension/releases/latest/download/ibm-blockchain-platform-che.yaml
cp -f ibm-blockchain-platform-che-${VERSION}.yaml ibm-blockchain-platform-che.yaml
