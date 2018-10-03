#!/bin/bash

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at

# http://www.apache.org/licenses/LICENSE-2.0

# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#-- script to automate preinstall, server compile, and package
# Exit on first error, print all commands.
set -ev
set -o pipefail

cd ./client

env

docker_logs() {
   DOCKER_NETWORK=hlfv1_default

    echo Starting monitoring on all containers on the network ${DOCKER_NETWORK}

    docker kill logspout 2> /dev/null 1>&2 || true
    docker rm logspout 2> /dev/null 1>&2 || true

    docker run -d --name="logspout" \
        --volume=/var/run/docker.sock:/var/run/docker.sock \
        --publish=127.0.0.1:8000:80 \
        --network  ${DOCKER_NETWORK} \
        gliderlabs/logspout

    curl http://127.0.0.1:8000/logs
}

if [ $TRAVIS_OS_NAME == "linux" ]; then
     export CXX="g++-4.9" CC="gcc-4.9" DISPLAY=:99.0;
fi

if [ "${TASK}" == "systest" ]; then
    ./integrationTest/scripts/run-integration-tests.sh
    # put back in if you want to see the docker logs when running the tests
    # docker_logs &

    export CODE_TESTS_PATH="$(pwd)/out/integrationTest";
    echo $CODE_TESTS_PATH;
    npm run systest 2>&1 | tee
    ./integrationTest/scripts/stop-integration-tests.sh;
else
    npm test
fi
