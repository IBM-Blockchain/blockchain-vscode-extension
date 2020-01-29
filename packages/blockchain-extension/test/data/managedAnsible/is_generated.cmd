@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem
setlocal enabledelayedexpansion
for %%v in (yofn_orderer.example.com yofn_ca.org1.example.com yofn_peer0.org1.example.com yofn_couchdb) do (
  docker volume inspect %%v > :NUL 2>&1
  if !ERRORLEVEL! == 0 ( 
    exit /b 0
  )
)
exit /b 1