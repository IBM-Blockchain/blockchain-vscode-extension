#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set +ev
if [ "$#" -ne 2 ]; then
    exit 1
fi
CHAINCODE_NAME=$1
CHAINCODE_VERSION=$2
for CONTAINER in $(docker ps -f name="^fabricvscodelocalfabric" -f label=org.hyperledger.fabric.chaincode.id.name="${CHAINCODE_NAME}" -f label=org.hyperledger.fabric.chaincode.id.version="${CHAINCODE_VERSION}" -q -a); do
    docker rm -f ${CONTAINER}
done
exit 0
