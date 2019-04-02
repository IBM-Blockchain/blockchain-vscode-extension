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
rm -fr admin-msp/*
rm -fr config/*
rm -fr crypto-config/*

# generate crypto material
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 cryptogen generate --config=./crypto-config.yaml
if [ "$?" -ne 0 ]; then
  echo "Failed to generate crypto material..."
  exit 1
fi

# rename the certificate authority private key
mv ./crypto-config/peerOrganizations/org1.example.com/ca/*_sk ./crypto-config/peerOrganizations/org1.example.com/ca/ca.org1.example.com-key.pem

# start the certificate authority
docker-compose -f docker-compose.yml up -d ca.example.com

# enroll the admin identity
rm -fr admin-msp/*
docker run --network fabricvscodelocalfabric_basic --rm -v $PWD/admin-msp:/tmp/admin-msp hyperledger/fabric-ca:1.4.0 fabric-ca-client enroll -u http://admin:adminpw@ca.example.com:7054 -M /tmp/admin-msp
cp -f admin-msp/signcerts/cert.pem crypto-config/peerOrganizations/org1.example.com/msp/admincerts/
cp -f admin-msp/signcerts/cert.pem crypto-config/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/admincerts/
mv admin-msp/keystore/*_sk admin-msp/keystore/key.pem

# stop the certificate authority
docker-compose -f docker-compose.yml stop ca.example.com

# generate genesis block for orderer
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgOrdererGenesis -outputBlock ./config/genesis.block
if [ "$?" -ne 0 ]; then
  echo "Failed to generate orderer genesis block..."
  exit 1
fi

# generate channel configuration transaction
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgChannel -outputCreateChannelTx ./config/channel.tx -channelID $CHANNEL_NAME
if [ "$?" -ne 0 ]; then
  echo "Failed to generate channel configuration transaction..."
  exit 1
fi

# generate anchor peer transaction
docker run --rm -v $PWD:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgChannel -outputAnchorPeersUpdate ./config/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP
if [ "$?" -ne 0 ]; then
  echo "Failed to generate anchor peer update for Org1MSP..."
  exit 1
fi

# create the file that shows we have generated the configuration
echo > generated.lock