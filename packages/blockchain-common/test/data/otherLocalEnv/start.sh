#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev
CONTAINER=$(docker ps -f label=fabric-environment-name="1 Org Local FabricMicrofab" -q -a)
if [ -z "$CONTAINER" ]
then
    export MICROFAB_CONFIG='{"port":8080, "endorsing_organizations": [{"name": "Org1"}],"channels": [{"name": "mychannel","endorsing_organizations": ["Org1"]}]}'
    docker run -e MICROFAB_CONFIG --label fabric-environment-name="1 Org Local Fabric  Microfab" -d -p 8080:8080 ibmcom/ibp-microfab:0.0.11
else
    docker start ${CONTAINER}
fi
sleep 2


exit 0