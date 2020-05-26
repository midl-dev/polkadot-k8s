#!/bin/bash

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
    echo "Will download $ARCHIVE_URL"
    curl $ARCHIVE_URL -o /polkadot/polkadot_archive.7z
    7z x /polkadot/polkadot_archive.7z -o/polkadot/.local/share/polkadot/chains/ksmcc3
    rm -v /polkadot/polkadot_archive.7z
    chmod -R 777 /polkadot/.local/
    chown -R 1000:1000 /polkadot/.local/
    find /polkadot/.local/share/
fi
