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

#-- script to auto publish plugin to VSCode marketplace
# Exit on first error, print all commands.
set -ev
set -o pipefail

# Grab the current root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd ${DIR}/client

# check that this is the right node.js version
if [ "${TRAVIS_NODE_VERSION}" != "" -a "${TRAVIS_NODE_VERSION}" != "8" ]; then
  echo Not executing as not running primary node.js version
  exit -1
fi

# Check that this is the main repository.
if [[ "${TRAVIS_REPO_SLUG}" != hyperledger* ]]; then
  echo "Skipping deploy; wrong repository slug."
  exit -1
fi

# Push the code to npm there there is a travis tag defined
if [ "${TRAVIS_TAG}" != "" ]; then

  # publish to the VSCode marketplace using VSCETOKEN
  vsce publish -p ${VSCETOKEN}
fi

echo Successfully published the new version
