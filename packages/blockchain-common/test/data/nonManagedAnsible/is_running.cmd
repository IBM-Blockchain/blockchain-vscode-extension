@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem
setlocal enabledelayedexpansion
for %%c in (yofn_orderer.example.com yofn_ca.org1.example.com yofn_peer0.org1.example.com yofn_couchdb ) do (
  for /f "usebackq delims=" %%i in (`docker inspect -f {{.State.Running}} %%c 2^>:NUL`) do set running=%%i
  if not !errorlevel! == 0 (
    exit /b 1
  )
  if not "!running!" == "true" (
    exit /b 1
  )
)
exit /b 0