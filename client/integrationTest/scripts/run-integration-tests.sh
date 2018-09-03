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

export CODE_TESTS_PATH="$(pwd)/out/integrationTest";
echo $CODE_TESTS_PATH;

# Switch into the system tests directory.
cd "${DIR}"


# Pull any required Docker images.

DOCKER_FILE=${DIR}/hlfv1/docker-compose.yml
docker pull hyperledger/fabric-peer:1.2.0
docker pull hyperledger/fabric-ca:1.2.0
docker pull hyperledger/fabric-ccenv:1.2.0
docker pull hyperledger/fabric-orderer:1.2.0
docker pull hyperledger/fabric-couchdb:0.4.10
if [ -d ./hlfv1/crypto-config ]; then
    rm -rf ./hlfv1/crypto-config
fi
cd hlfv1
tar -xvf crypto-config.tar.gz
# Rename all the keys so we don't have to maintain them in the code.
for KEY in $(find crypto-config -type f -name "*_sk"); do
    KEY_DIR=$(dirname ${KEY})
    mv ${KEY} ${KEY_DIR}/key.pem
done

# Start any required Docker images.
if [ "${DOCKER_FILE}" != "" ]; then
    echo Using docker file ${DOCKER_FILE}
    ARCH=$ARCH docker-compose -f ${DOCKER_FILE} kill
    ARCH=$ARCH docker-compose -f ${DOCKER_FILE} down
    docker rmi -f $(docker images -aq dev-*) || true
    ARCH=$ARCH docker-compose -f ${DOCKER_FILE} up -d

    cd "${DIR}"

    if [ `uname` = "Darwin" ]; then
        export GATEWAY=docker.for.mac.localhost
    else
        export GATEWAY="$(docker inspect hlfv1_default | grep Gateway | cut -d \" -f4)"
    fi
fi

# configure v1 to run the tests

sleep 10

# Create the channel
docker exec -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel create -o orderer.example.com:7050 -c mychannel -f /etc/hyperledger/configtx/my-channel.tx
# Join peer0 from org1 to the channel.
docker exec -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel join -b mychannel.block

# Create the other channel
docker exec -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel create -o orderer.example.com:7050 -c myotherchannel -f /etc/hyperledger/configtx/my-other-channel.tx
# Join peer0 from org1 to the channel.
docker exec -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.example.com/msp" peer0.org1.example.com peer channel join -b myotherchannel.block

# Run the system tests.
npm run systest 2>&1 | tee


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


