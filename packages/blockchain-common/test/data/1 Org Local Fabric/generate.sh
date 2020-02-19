#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev
docker run --rm -v "$PWD":/network -v /var/run/docker.sock:/var/run/docker.sock --network host ibmblockchain/ansible:latest ansible-playbook /network/playbook.yml
docker run --rm -v "$PWD":/network ibmblockchain/ansible:latest chown -R $(id -u):$(id -g) /network
exit 0