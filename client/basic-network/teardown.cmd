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
rem docker rm $(docker ps -aq)
rem docker rmi $(docker images dev-* -q)

rem Your system is now clean
