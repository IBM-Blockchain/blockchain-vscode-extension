@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem
setlocal enabledelayedexpansion
if [%1] == [] (
    exit /b 1
) else if [%2] == [] (
    exit /b 1
)
set CHAINCODE_NAME=%1
set CHAINCODE_VERSION=%2
for /f "usebackq tokens=*" %%c in (`docker ps -f name^="^^fabricvscodelocalfabric" -f label^=org.hyperledger.fabric.chaincode.id.name^="%CHAINCODE_NAME%" -f label^=org.hyperledger.fabric.chaincode.id.version^="%CHAINCODE_VERSION%" -q -a`) do (
    docker rm -f %%c
    if !errorlevel! neq 0 (
        exit /b !errorlevel!
    )
)
exit /b 0