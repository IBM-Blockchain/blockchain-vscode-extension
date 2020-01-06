#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set +ev
for volume in yofn_orderer.example.com yofn_ca.org1.example.com yofn_peer0.org1.example.com yofn_couchdb; do
  if ! docker volume inspect $volume > /dev/null 2>&1; then 
    exit 1
  fi
done
exit 0