@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem

rem rewrite paths for Windows users to enable Docker socket binding
set COMPOSE_CONVERT_WINDOWS_PATHS=1

set CHANNEL_NAME=mychannel

rem remove previous crypto material and config transactions
if exist admin-msp (
  rmdir /q/s admin-msp 
  mkdir admin-msp
)
if exist config (
  rmdir /q/s config
  mkdir config
)
if exist crypto-config (
  rmdir /q/s crypto-config
  mkdir crypto-config
)

rem generate crypto material
docker run --rm -v %CD%:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 cryptogen generate --config=./crypto-config.yaml
if errorlevel 1 (
  echo "Failed to generate crypto material..."
  exit /b 1
)

rem rename the certificate authority private key
rename crypto-config\peerOrganizations\org1.example.com\ca\*_sk crypto-config\peerOrganizations\org1.example.com\ca\ca.org1.example.com-key.pem

rem start the certificate authority
docker-compose -f docker-compose.yml up -d ca.example.com

rem enroll the admin identity
docker run --network fabricvscodelocalfabric_basic --rm -v %CD%\admin-msp:/tmp/admin-msp hyperledger/fabric-ca:1.4.0 fabric-ca-client enroll -u http://admin:adminpw@ca.example.com:7054 -M /tmp/admin-msp
copy /y admin-msp\signcerts\cert.pem crypto-config\peerOrganizations\org1.example.com\msp\admincerts\
copy /y admin-msp\signcerts\cert.pem crypto-config\peerOrganizations\org1.example.com\peers\peer0.org1.example.com\msp\admincerts\
rename admin-msp\keystore\*_sk admin-msp\keystore\key.pem

rem stop the certificate authority
docker-compose -f docker-compose.yml stop ca.example.com

rem generate genesis block for orderer
docker run --rm -v %CD%:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgOrdererGenesis -outputBlock ./config/genesis.block
if errorlevel 1 (
  echo "Failed to generate orderer genesis block..."
  exit /b 1
)

rem generate channel configuration transaction
docker run --rm -v %CD%:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgChannel -outputCreateChannelTx ./config/channel.tx -channelID $CHANNEL_NAME
if errorlevel 1 (
  echo "Failed to generate channel configuration transaction..."
  exit /b 1
)

rem generate anchor peer transaction
docker run --rm -v %CD%:/etc/hyperledger/fabric -w /etc/hyperledger/fabric hyperledger/fabric-tools:1.4.0 configtxgen -profile OneOrgChannel -outputAnchorPeersUpdate ./config/Org1MSPanchors.tx -channelID $CHANNEL_NAME -asOrg Org1MSP
if errorlevel 1 (
  echo "Failed to generate anchor peer update for Org1MSP..."
  exit /b 1
)

rem create the file that shows we have generated the configuration
echo. > generated.lock