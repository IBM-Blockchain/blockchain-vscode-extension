#!/usr/bin/env bash
#
# SPDX-License-Identifier: Apache-2.0
#
set -ex
ROOT=$(git rev-parse --show-toplevel)
cd ${ROOT}
cp -f package.json package.json.orig
trap "cd ${ROOT}; cp -f package.json.orig package.json; rm -f package.json.orig" EXIT
npm ci --only=production
npm install vsce
npm run compile
npm run productionFlag
cat package.json.orig \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.ext.bypassPreReqs".default = true' \
    | jq '.contributes.configuration.properties."ibm-blockchain-platform.home.showOnStartup".default = false' \
    | jq '(.actualActivationEvents.onView | map("onView:" + .)) as $onView |
          (.actualActivationEvents.onCommand | map("onCommand:" + .)) as $onCommand |
          (.actualActivationEvents.other) as $other |
          .activationEvents = $onView + $onCommand + $other' \
    > package.json
npm run package
mv ibm-blockchain-platform-*.vsix docker/ibm-blockchain-platform-docker.vsix
cd docker
docker build -t ibmblockchain/vscode:latest .