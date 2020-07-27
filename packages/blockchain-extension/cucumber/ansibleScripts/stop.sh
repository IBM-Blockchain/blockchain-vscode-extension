#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

# Grab the parent (root) directory.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Switch into the system tests directory.
cd "${DIR}/ansible"

pwd

docker run --rm -v $PWD:/network -v /var/run/docker.sock:/var/run/docker.sock --network host ibmblockchain/vscode-prereqs:fabric-v2.2 ansible-playbook --extra-vars state=absent /network/playbook.yaml
