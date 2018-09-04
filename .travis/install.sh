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

npm install

npm run compile


if [ "${TASK}" == "unit" ]; then
    node ./node_modules/.bin/electron-rebuild -v 2.0

    if [ $TRAVIS_OS_NAME == "linux" ]; then
        export CXX="g++-4.9" CC="gcc-4.9" DISPLAY=:99.0;
        rm -rf ./node_modules/grpc/src/node/extension_binary/node-v57-linux-x64-glibc
        mv ./node_modules/grpc/src/node/extension_binary/electron-v2.0-linux-x64-glibc ./node_modules/grpc/src/node/extension_binary/node-v57-linux-x64-glibc
    else
        rm -rf ./node_modules/grpc/src/node/extension_binary/node-v57-darwin-x64-unknown
        mv ./node_modules/grpc/src/node/extension_binary/electron-v2.0-darwin-x64-unknown ./node_modules/grpc/src/node/extension_binary/node-v57-darwin-x64-unknown
    fi
fi
