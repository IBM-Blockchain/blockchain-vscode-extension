@echo on
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem
docker run --rm -v "%CD%":/network -v /var/run/docker.sock:/var/run/docker.sock --network host ibmblockchain/ansible:latest ansible-playbook /network/playbook.yml
if %errorlevel% neq 0 (
    exit /b %errorlevel%
)
exit /b 0