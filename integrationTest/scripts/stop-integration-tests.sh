#!/bin/bash
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Exit on first error, print all commands.
set -ev
set -o pipefail

# Set ARCH
ARCH=`uname -m`

# Grab the parent (root) directory.
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

# Switch into the system tests directory.
cd "${DIR}"

DOCKER_FILE=${DIR}/hlfv1/docker-compose.yml

# Kill and remove any started Docker images.
if [ "${DOCKER_FILE}" != "" ]; then
    ARCH=$ARCH docker-compose -f ${DOCKER_FILE} kill
    ARCH=$ARCH docker-compose -f ${DOCKER_FILE} down
    docker rmi -f $(docker images -aq dev-*) || true
fi

# Delete any crypto-config material
cd "${DIR}"
if [ -d ./hlfv1/crypto-config ]; then
    rm -rf ./hlfv1/crypto-config
fi


