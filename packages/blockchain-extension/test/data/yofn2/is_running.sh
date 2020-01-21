#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set +ev
NUM_CONTAINERS=$(docker ps -f label=fabric-environment-name="Local Fabric" -q | wc -l | tr -d ' ')
if [ "${NUM_CONTAINERS}" -eq 0 ]; then
  exit 1
fi
exit 0