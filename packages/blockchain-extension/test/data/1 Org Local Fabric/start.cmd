@echo on
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem
setlocal enabledelayedexpansion


FOR /F "usebackq tokens=*" %%g IN ('docker ps -f label^=fabric-environment-name^="1 Org Local FabricMicrofab" -q -a') do (SET CONTAINER=%%g)

IF DEFINED CONTAINER (
     docker start %CONTAINER%
     if !errorlevel! neq 0 (
        exit /b !errorlevel!
    )
) ELSE (
    export MICROFAB_CONFIG='{"port":8080, "endorsing_organizations": [{"name": "Org1"}],"channels": [{"name": "mychannel","endorsing_organizations": ["Org1"]}]}'
    docker run -e MICROFAB_CONFIG --label fabric-environment-name="1 Org Local FabricMicrofab" -d -p 8080:8080 ibmcom/ibp-microfab:0.0.10
)


exit /b 0