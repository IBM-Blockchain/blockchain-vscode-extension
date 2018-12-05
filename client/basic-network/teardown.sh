#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -e

# Shut down the Docker containers for the system tests.
docker-compose -f docker-compose.yml kill && docker-compose -f docker-compose.yml down -v

# remove the local state
rm -f ~/.hfc-key-store/*

# remove chaincode docker images
docker rm -f $(docker ps -aq --filter "name=${COMPOSE_PROJECT_NAME}-*")
docker rmi -f $(docker images -aq "${COMPOSE_PROJECT_NAME}-*")

# Your system is now clean
