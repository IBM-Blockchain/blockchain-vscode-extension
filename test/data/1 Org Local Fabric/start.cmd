@echo on
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem
setlocal enabledelayedexpansion
for /f "usebackq tokens=*" %%c in (`docker ps -f label^=fabric-environment-name^="Local Fabric" -q -a`) do (
    docker start %%c
    if !errorlevel! neq 0 (
        exit /b !errorlevel!
    )
)
exit /b 0