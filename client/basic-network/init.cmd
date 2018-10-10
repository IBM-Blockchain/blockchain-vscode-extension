@echo off
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem

rem delete previous creds
if exist %userprofile%\.hfc-key-store (
    rmdir /q/s %userprofile%\.hfc-key-store
)

rem copy peer admin credentials into the keyValStore
mkdir %userprofile%\.hfc-key-store
