#!/usr/bin/env bash
#
# SPDX-License-Identifier: Apache-2.0
#
set -ex
FILES=$(cd /etc/skel && find . -type f)
for FILE in ${FILES}; do
    if [ ! -r ~/${FILE} ]; then
        tar cf - -C /etc/skel ${FILE} | tar xf - -C ~
    fi
done
exec dumb-init code-server --host 0.0.0.0 --extra-extensions-dir /usr/local/extensions --auth none