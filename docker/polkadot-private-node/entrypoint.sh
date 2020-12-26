#!/bin/bash

set -e
set -x

if [ -e /polkadot-node-keys/$(hostname) ]; then
    node_key_param="--node-key $(cat /polkadot-node-keys/$(hostname))"
fi

if [ ! -z "$VALIDATOR_NAME" ]; then
    name_param="--name \"$VALIDATOR_NAME\""
fi

if [ ! -z "$CHAIN" ]; then
    chain_param="--chain \"$CHAIN\""
fi

if [ ! -z "$TELEMETRY_URL" ]; then
    telemetry_url_param="--telemetry-url \"$TELEMETRY_URL 0\""
fi

# unsafe flags are due to polkadot panic alerter needing to connect to the node with rpc
eval /usr/bin/polkadot --validator --wasm-execution Compiled \
         --unsafe-pruning \
         --out-peers=100 \
         --pruning=1000 \
         --prometheus-external \
         $node_key_param \
         $name_param \
         $telemetry_url_param \
         $chain_param
