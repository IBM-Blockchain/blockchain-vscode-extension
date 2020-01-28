@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem
for /f "usebackq tokens=*" %%n in (`docker ps -f label^=fabric-environment-name^="Local Fabric" -q ^| find /v /c ""`) do set NUM_CONTAINERS=%%n
if %NUM_CONTAINERS% equ 0 (
    exit /b 1
)
exit /b 0