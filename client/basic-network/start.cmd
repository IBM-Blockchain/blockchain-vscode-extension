@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem

rem rewrite paths for Windows users to enable Docker socket binding
set COMPOSE_CONVERT_WINDOWS_PATHS=1

docker-compose -f docker-compose.yml down

docker-compose -f docker-compose.yml up -d ca.example.com orderer.example.com peer0.org1.example.com couchdb

rem wait for Hyperledger Fabric to start
rem incase of errors when running later commands, issue export FABRIC_START_TIMEOUT=<larger number>
set FABRIC_START_TIMEOUT=30
for /L %%i in (1, 1, %FABRIC_START_TIMEOUT%) do (
    rem This command only works if the peer is up and running
    docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" %COMPOSE_PROJECT_NAME%_peer0.org1.example.com peer channel list > NUL 2>&1
    if errorlevel 1 (
        rem This is the closest thing that Windows has to the sleep command
        choice /t 1 /c x /d x /n > NUL
    ) else (
        set i=%%i
        goto :done
    )
)
:done
echo Hyperledger Fabric started in %i% seconds

rem Check to see if the channel already exists
docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" %COMPOSE_PROJECT_NAME%_peer0.org1.example.com peer channel getinfo -c mychannel
if errorlevel 1 (
    rem Create the channel
    docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" %COMPOSE_PROJECT_NAME%_peer0.org1.example.com peer channel create -o orderer.example.com:7050 -c mychannel -f /etc/hyperledger/configtx/channel.tx
    rem Join peer0.org1.example.com to the channel.
    docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" %COMPOSE_PROJECT_NAME%_peer0.org1.example.com peer channel join -b mychannel.block
)
