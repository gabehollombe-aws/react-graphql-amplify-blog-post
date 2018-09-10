#!/bin/bash
set -e
set -x

# Get dir of script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
pushd $DIR

# Install npm deps for app
pushd ../../
npm install
popd

# Update AppSync
node --experimental-modules updateAppSync.mjs