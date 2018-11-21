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
set -ex
set -o pipefail

if [ "${TASK}" != "systest" ]; then
    exit 0
fi

# Grab the current root directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd ${DIR}/client

# check that this is the right node.js version
if [ "${TRAVIS_NODE_VERSION}" != "" -a "${TRAVIS_NODE_VERSION}" != "8" ]; then
  echo Not executing as not running primary node.js version
  exit -1
fi

# Check that this is the main repository.
if [[ "${TRAVIS_REPO_SLUG}" != IBM-Blockchain* ]]; then
  echo "Skipping deploy; wrong repository slug."
  exit -1
fi

# Push the code to npm there there is a travis tag defined
if [ "${TRAVIS_TAG}" != "" ]; then

  # We will also need to trigger the production flag change.
  npm run productionFlag

  npm run package

  # We now need to do any VS Code publishing config here
  node ./node_modules/vsce/out/vsce publish -p ${VSCETOKEN}

  # Once all the VS Code publishing is done, we can bump the version on GitHub

  # Configure the Git repository and clean any untracked and unignored build files.
  npm install -g @alrra/travis-scripts
  set-up-ssh --key "$encrypted_ecae65fefad0_key" \
                             --iv "$encrypted_ecae65fefad0_iv" \
                             --path-encrypted-key "../.travis/github_deploy_key.enc"

  git config user.name "${GH_USER_NAME}"
  git config user.email "${GH_USER_EMAIL}"
  git reset --hard
  git checkout -b master -f
  git clean -d -f

  npm install semver

  # Bump the version number.
  node ./scripts/pkgbump.js

  export NEW_VERSION=$(node -e "console.log(require('./package.json').version)")

  # Change from HTTPS to SSH.
  ../.travis/fix_github_https_repo.sh

  # Add the version number changes and push them to Git.
  git add .
  git commit -m "Automatic version bump to ${NEW_VERSION}"
  git push origin master

fi

echo Successfully published the new version
