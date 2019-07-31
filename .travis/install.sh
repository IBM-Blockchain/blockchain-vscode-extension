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

npm --version

node --version

npm install --no-optional
npm install --ignore-scripts

npm audit

npm run compile

if [ "${TASK}" == "unit" ]; then
    TARGET=3.0.0
    ELECTRON=3.0
    if [ "${VERSION}" == "insiders" ]; then
        TARGET=4.1.5
        ELECTRON=4.1
    fi

    npm rebuild grpc --target=$TARGET --runtime=electron --dist-url=https://atom.io/download/electron

    if [ $TRAVIS_OS_NAME == "linux" ]; then
        export CXX="g++-4.9" CC="gcc-4.9" DISPLAY=:99.0;
        rm -rf ./node_modules/grpc/src/node/extension_binary/node-v64-linux-x64-glibc
        mv ./node_modules/grpc/src/node/extension_binary/electron-v${ELECTRON}-linux-x64-glibc ./node_modules/grpc/src/node/extension_binary/node-v64-linux-x64-glibc
    elif [ $TRAVIS_OS_NAME == "windows" ]; then
        rm -rf ./node_modules/grpc/src/node/extension_binary/node-v64-win32-x64-unknown
        mv ./node_modules/grpc/src/node/extension_binary/electron-v${ELECTRON}-win32-x64-unknown ./node_modules/grpc/src/node/extension_binary/node-v64-win32-x64-unknown
    else
        rm -rf ./node_modules/grpc/src/node/extension_binary/node-v64-darwin-x64-unknown
        mv ./node_modules/grpc/src/node/extension_binary/electron-v${ELECTRON}-darwin-x64-unknown ./node_modules/grpc/src/node/extension_binary/node-v64-darwin-x64-unknown
    fi
fi
