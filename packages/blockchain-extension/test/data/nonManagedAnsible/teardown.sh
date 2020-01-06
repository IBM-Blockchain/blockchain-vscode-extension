#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev

# Shut down the Docker containers for the system tests.
docker-compose -f docker-compose.yml kill && docker-compose -f docker-compose.yml down -v

# remove chaincode docker images
(docker ps -aq --filter "name=yofn-*" | xargs docker rm -f) || true
(docker images -aq "yofn-*" | xargs docker rmi -f) || true

# remove previous crypto material and config transactions
rm -fr admin-msp/* configtx/* crypto-config/* wallets/local_fabric_wallet/*

# Your system is now clean
