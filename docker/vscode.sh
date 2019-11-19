#!/usr/bin/env bash
#
# SPDX-License-Identifier: Apache-2.0
#
set -ex
if [ ! -r ~/.profile ]; then
    tar cf - -C /etc/skel . | tar xf - -C ~
fi
exec dumb-init code-server --host 0.0.0.0 --extra-extensions-dir /usr/local/extensions --auth none