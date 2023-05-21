#!/usr/bin/env bash

set -ex

$@

find /usr/local/lib/node_modules/npm/node_modules/node-gyp/gyp/pylib/gyp/ \
    -name '*.pyc' \
    -delete

find /tmp/ -mindepth 1 -maxdepth 1 -exec rm -rf '{}' +

rm \
    /root/.config \
    /root/.cache \
    /root/.node-gyp \
    /root/.npm \
    /root/.yarn/ \
    -rf
