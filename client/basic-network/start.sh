#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

docker-compose -f docker-compose.yml down

# Download and tag latest development images from Hyperledger Nexus server.
# Delete these 5 lines once Fabric v1.3 has been shipped!
for IMAGE in hyperledger/fabric-ca hyperledger/fabric-orderer hyperledger/fabric-peer hyperledger/fabric-tools hyperledger/fabric-ccenv
do
    docker pull nexus3.hyperledger.org:10001/${IMAGE}:amd64-1.3.0-stable
    docker tag nexus3.hyperledger.org:10001/${IMAGE}:amd64-1.3.0-stable ${IMAGE}
done

docker-compose -f docker-compose.yml up -d ca.example.com orderer.example.com peer0.org1.example.com couchdb

# wait for Hyperledger Fabric to start
# incase of errors when running later commands, issue export FABRIC_START_TIMEOUT=<larger number>
export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

# Create the channel
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" fabric-vscode-${FABRIC_RUNTIME_NAME}_peer0.org1.example.com_1 peer channel create -o orderer.example.com:7050 -c mychannel -f /etc/hyperledger/configtx/channel.tx
# Join peer0.org1.example.com to the channel.
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" fabric-vscode-${FABRIC_RUNTIME_NAME}_peer0.org1.example.com_1 peer channel join -b mychannel.block
