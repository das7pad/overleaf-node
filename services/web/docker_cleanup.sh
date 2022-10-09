#!/usr/bin/env bash

set -ex

$@

find /usr/local/lib/node_modules/npm/node_modules/node-gyp/gyp/pylib/gyp/ \
    -name '*.pyc' \
    -delete

if [[ -d /overleaf/services/web/node_modules ]]; then
    pushd /overleaf/services/web/node_modules
    rm -rf .cache

    find . @* -mindepth 2 -maxdepth 2 \
        \( \
        -name test \
        -or -name tests \
        -or -name .github \
        -or -iname 'HISTORY*' \
        \) \
        -exec rm -rf '{}' +

    find . -type f \
        \( \
        -name '.*' \
        -or -name index.html \
        -or -name bower.json \
        -or -name karma.conf.js \
        -or -iname 'README*' \
        -or -iname 'CHANGELOG*' \
        -or -iname 'CONTRIBUTING*' \
        -or -name Makefile \
        \) \
        -not -name .eslintrc.json \
        -delete

    find mathjax/fonts -mindepth 3 -maxdepth 3 \
      -not -path mathjax/fonts/HTML-CSS/TeX/woff \
      -exec rm -rf '{}' +
    popd
fi

find /tmp/ -mindepth 1 -maxdepth 1 -exec rm -rf '{}' +

rm \
    /root/.config \
    /root/.cache \
    /root/.node-gyp \
    /root/.npm \
    -rf
