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
cp -r ./media ./packages/blockchain-extension/media
cd ./packages/blockchain-extension
npm install vsce
npm install ../blockchain-ui/ibm-blockchain-platform-ui-*.tgz
npm install ../blockchain-common/ibm-blockchain-platform-common-*.tgz
npm install ../blockchain-gateway-v1/ibm-blockchain-platform-gateway-v1-*.tgz
npm run compile
npm run productionFlag
cat package.json.orig \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.ext.bypassPreReqs".default = true' \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.home.showOnStartup".default = false' \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.ext.enableLocalFabric".default = false' \
    | jq '(.actualActivationEvents.onView | map("onView:" + .)) as $onView |
          (.actualActivationEvents.onCommand | map("onCommand:" + .)) as $onCommand |
          (.actualActivationEvents.other) as $other |
          .activationEvents = $onView + $onCommand + $other' \
    > package.json
npm run package
cd ${ROOT}
mv ./packages/blockchain-extension/ibm-blockchain-platform-*.vsix docker/ibm-blockchain-platform-docker.vsix
cd docker
docker build -t ibmblockchain/vscode:latest .
