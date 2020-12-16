#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set +ev
NUM_CONTAINERS=$(docker container port $(docker ps -f label=fabric-environment-name="1 Org Local FabricMicrofab" -q) | grep 8080/tcp | wc -l | tr -d ' ')
if [ "${NUM_CONTAINERS}" -eq 0 ]; then
  exit 1
fi
exit 0