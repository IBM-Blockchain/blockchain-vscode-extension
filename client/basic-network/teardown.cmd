@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem

rem Shut down the Docker containers for the system tests.
docker-compose -f docker-compose.yml kill && docker-compose -f docker-compose.yml down

rem remove the local state
if exist %userprofile%\.hfc-key-store (
    rmdir /q/s %userprofile%\.hfc-key-store
)

rem remove chaincode docker images
for /f "tokens=*" %%i in ('docker ps -aq --filter "name=%COMPOSE_PROJECT_NAME%-*"') do docker rm -f %%i
for /f "tokens=*" %%i in ('docker images -aq "%COMPOSE_PROJECT_NAME%-*"') do docker rmi -f %%i

rem delete the file that shows we have generated the configuration
del /q generated.lock

rem Your system is now clean
