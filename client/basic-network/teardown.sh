#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Don't exit on first error, print all commands.
set +e
set -v

# Remove the Docker containers for the runtime components.
docker rm -f fabricvscodelocalfabric_peer0.org1.example.com
docker rm -f fabricvscodelocalfabric_ca.example.com
docker rm -f fabricvscodelocalfabric_orderer.example.com
docker rm -f fabricvscodelocalfabric_couchdb
docker rm -f fabricvscodelocalfabric_logs

# Remove the Docker containers and images for any chaincode images.
docker ps -aq --filter "name=fabricvscodelocalfabric-*" | xargs docker rm -f
docker images -aq "fabricvscodelocalfabric-*" | xargs docker rmi -f

# Remove the Docker volumes.
docker volume rm -f fabricvscodelocalfabric_peer0.org1.example.com
docker volume rm -f fabricvscodelocalfabric_ca.example.com
docker volume rm -f fabricvscodelocalfabric_orderer.example.com
docker volume rm -f fabricvscodelocalfabric_couchdb
docker volume rm -f fabricvscodelocalfabric_logs

# Remove the Docker network.
docker network rm fabricvscodelocalfabric_basic

exit 0