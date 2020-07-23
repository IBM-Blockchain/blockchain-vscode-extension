#!/usr/bin/env bash
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
set -ex

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo ${ROOT_DIR}
cd "${ROOT_DIR}"
if [ ! -d tmp ]; then
  mkdir tmp
else
  rm -rf tmp
  mkdir tmp
fi

pushd tmp
curl -sSL http://bit.ly/2ysbOFE | bash -s 2.1.0
pushd fabric-samples/test-network
export FABRIC_DIR="$(pwd)"
./network.sh down
./network.sh up createChannel -ca -s couchdb
popd
popd
