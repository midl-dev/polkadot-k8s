#!/bin/bash

set -e
set -x

get_node_id() {
    node_id=$(cat /polkadot-node-ids/$1)
    printf '%s\n' "--sentry-nodes /dns4/$1.polkadot-sentry-node/tcp/30333/p2p/$node_id"
}

sentry_node_0_param=$(get_node_id "polkadot-sentry-node-0")
sentry_node_1_param=$(get_node_id "polkadot-sentry-node-1")

if [ -e /polkadot-node-keys/$(hostname) ]; then
    node_key_param="--node-key $(cat /polkadot-node-keys/$(hostname))"
fi

if [ ! -z "$VALIDATOR_NAME" ]; then
    name_param="--name \"$VALIDATOR_NAME\""
fi

if [ ! -z "$TELEMETRY_URL" ]; then
    telemetry_url_param="--telemetry-url \"$TELEMETRY_URL 0\""
fi

eval /usr/local/bin/polkadot --validator --pruning=archive --wasm-execution Compiled \
         --reserved-only \
         --prometheus-external \
         --unsafe-ws-external \
         --unsafe-rpc-external \
         --rpc-cors=all \
         $sentry_node_0_param \
         $sentry_node_1_param \
         $node_key_param \
         $name_param \
         $telemetry_url_param
