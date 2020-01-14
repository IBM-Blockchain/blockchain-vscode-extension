#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev
for CONTAINER in $(docker ps -f label=fabric-environment-name="Local Fabric" -q -a); do
    docker rm -f ${CONTAINER}
done
for VOLUME in $(docker volume ls -f label=fabric-environment-name="Local Fabric" -q); do
    docker volume rm -f ${VOLUME}
done
if [ -d wallets ]; then
    for WALLET in $(ls wallets); do
        rm -rf wallets/${WALLET}/*
    done
fi
exit 0