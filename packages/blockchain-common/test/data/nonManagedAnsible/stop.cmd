@echo on
rem
rem Copyright IBM Corp All Rights Reserved
rem
rem SPDX-License-Identifier: Apache-2.0
rem

rem Shut down the Docker containers that might be currently running.
docker-compose -f docker-compose.yml stop
