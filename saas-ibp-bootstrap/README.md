# saas-ibp-bootstrap

This directory contains a set of Ansible Playbooks for creating the peer/orderers/channels expected bv the Cucucmber SaaS tests.
(referred to as cucumber opsTools)

It is based on the standard Ansible IBP Collection tutorial with these changes
- Chaincode deploy not included
- Two channels created mychannel1 with v2 capabilities, and mychannel2 with v1.4.2 capabilities


To re-bootstrap the IBP instance used by the cucumber tests. 

- find or create an IBP SaaS instance
- ensure that there is a IBM Cloud API key that can be used to loginto the account that created the SaaS instance
- create a service account for the IBP SaaS instance
- set these variables in the org1/org2/orderer vars files (see the original tutorial for reference)
- run the build-network.sh and join-network.sh scripts
- upload the JSON files to the AzurePipelines secure files store
- Ensure that the AzurePipelines variables have the correct keys
  - this is a variable group 'opsTools`
    - opsTools_key = the service account key
    - opsTools_SaaS_api_key = the ibm cloud api key
    - opsTools_secret = anything as this isn't used with IBM Cloud login
    - opsTools_url = the IBP console URL

## Running locally

The OpsTools Cucumber tests can be run locally against a remote IBP instance. Here for example is the script to do this from Ubuntu running in WSL2

```
#!/bin/bash

set -e -o pipefail

export OPSTOOLS_FABRIC=true
export LIBGL_ALWAYS_INDIRECT=1
export DISPLAY=$(ip route list default | awk '{print $3}'):0
export DONT_PROMPT_WSL_INSTALL=true
export IBP_API_KEY=xxxxxxxxxxxxxxxxx
export CLOUD_API_KEY=xxxxxxxxxxxxxxxxxxxxxxx
export IBP_URL=https://xxxxxxx.blockchain.cloud.ibm.com
export JSON_DIR=/home/xxxxxx/github.com/ibp/blockchain-vscode-extension/saas-ibp-bootstrap


pushd ./packages/blockchain-extension
npm run cucumber -- $IBP_URL $IBP_API_KEY anything $CLOUD_API_KEY 2>/dev/null | grep -v '^$' | grep -v container | tee op.log
popd
```