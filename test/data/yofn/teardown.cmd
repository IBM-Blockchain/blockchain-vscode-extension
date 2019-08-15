@echo on
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem

rem Shut down the Docker containers for the system tests.
docker-compose -f docker-compose.yml kill && docker-compose -f docker-compose.yml down -v

rem remove chaincode docker images
for /f "tokens=*" %%i in ('docker ps -aq --filter "name=yofn-*"') do docker rm -f %%i
for /f "tokens=*" %%i in ('docker images -aq "yofn-*"') do docker rmi -f %%i

rem remove previous crypto material and config transactions
for %%d in (admin-msp configtx crypto-config wallets\local_fabric_wallet) do (
  pushd %%d
  rmdir /q/s .
  popd
)

rem Your system is now clean
