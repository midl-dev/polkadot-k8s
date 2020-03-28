#!/bin/sh

set -e

if [ -d /polkadot/.local/share/polkadot/chains/ksmcc3/db/ ]; then
    echo "Blockchain database already exists, no need to import, exiting"
    exit 0
elif [ -z "$ARCHIVE_URL" ]; then
    echo "No archive download url specified, exiting"
    exit 0
else
    echo "Did not find pre-existing data, importing blockchain"
    rm -rvf /polkadot/.local/share/polkadot
    mkdir -p /polkadot/.local/share/polkadot/chains/ksmcc3/
    snapshot=$(echo -n "$@")
    echo "Will download $ARCHIVE_URL"
    curl -L $snapshot | lz4 -d | tar -xvf - -C /polkadot/.local/share/polkadot/chains/ksmcc3/
    chmod -R 777 /polkadot/.local/
    chown -R 1000:1000 /polkadot/.local/
    find /polkadot/.local/share/
fi
