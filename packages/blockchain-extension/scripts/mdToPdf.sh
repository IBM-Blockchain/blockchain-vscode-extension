#!/bin/bash

set -ev

# install npm module
npm install pretty-markdown-pdf

#cd to the new tutorials folder
cd ../tutorials/new-tutorials

for D in `find . -mindepth 1 -maxdepth 1 -type d`; do
    cd $D
    echo "Current directory --> $D"
    for file in `find . -name "*.md" -maxdepth 1 -type f`; do
        if [ "$file" != "./index.md" ] && [ "$file" != "./styleguide.md" ]; then
        ../../../node-modules/pretty-md-pdf -i $file
        echo "$file"
        fi
    done
    mv *.pdf pdf
    pwd
    cd ../
done
