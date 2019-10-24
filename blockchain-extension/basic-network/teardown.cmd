@echo on
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem

rem Remove the Docker containers for the runtime components.
docker rm -f fabricvscodelocalfabric_peer0.org1.example.com
docker rm -f fabricvscodelocalfabric_ca.example.com
docker rm -f fabricvscodelocalfabric_orderer.example.com
docker rm -f fabricvscodelocalfabric_couchdb
docker rm -f fabricvscodelocalfabric_logs

rem Remove the Docker containers and images for any chaincode images.
for /f "tokens=*" %%i in ('docker ps -aq --filter "name=fabricvscodelocalfabric-*"') do docker rm -f %%i
for /f "tokens=*" %%i in ('docker images -aq "fabricvscodelocalfabric-*"') do docker rmi -f %%i

rem Remove the Docker volumes.
docker volume rm -f fabricvscodelocalfabric_peer0.org1.example.com
docker volume rm -f fabricvscodelocalfabric_ca.example.com
docker volume rm -f fabricvscodelocalfabric_orderer.example.com
docker volume rm -f fabricvscodelocalfabric_couchdb
docker volume rm -f fabricvscodelocalfabric_logs

rem Remove the Docker network.
docker network rm -f fabricvscodelocalfabric_basic

exit /b 0