#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

CHANNEL_NAME=mychannel

# remove previous crypto material and config transactions
rm -fr admin-msp/* configtx/* crypto-config/* wallets/local_fabric_wallet/*

fix_permissions () {
  docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 chown -R $(id -u):$(id -g) ./configtx ./crypto-config ./admin-msp
}

# generate crypto material
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 cryptogen generate --config=./crypto-config.yaml
fix_permissions

# rename the certificate authority private key
mv ./crypto-config/peerOrganizations/org1.example.com/ca/*_sk ./crypto-config/peerOrganizations/org1.example.com/ca/ca.org1.example.com-key.pem

# start the certificate authority
docker-compose -f docker-compose.yml up -d ca.org1.example.com

# enroll the admin identity
docker run --network yofn_basic --rm -v $PWD:/etc/hyperledger/fabric hyperledger/fabric-ca:1.4.0 fabric-ca-client enroll -u http://admin:adminpw@ca.org1.example.com:17054 -M /etc/hyperledger/fabric/admin-msp
fix_permissions
cp -f admin-msp/signcerts/cert.pem crypto-config/peerOrganizations/org1.example.com/msp/admincerts/
cp -f admin-msp/signcerts/cert.pem crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/admincerts/

# stop the certificate authority
docker-compose -f docker-compose.yml stop ca.org1.example.com

# generate genesis block for orderer
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgOrdererGenesis -outputBlock ./configtx/genesis.block

# generate channel configuration transaction
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgChannel -outputCreateChannelTx ./configtx/channel.tx -channelID $CHANNEL_NAME

# generate anchor peer transaction
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgChannel -outputAnchorPeersUpdate ./configtx/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP

# fix the ownership of all of the generated configuration
fix_permissions

# generate gateways, nodes, and wallets
node generate.js
