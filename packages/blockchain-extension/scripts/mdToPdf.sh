#!/bin/bash

set -ev

# install npm module
npm install pretty-markdown-pdf fs-extra

node ./convertTutorialsToPDF.js

git checkout ../package.json && git checkout ../package-lock.json

