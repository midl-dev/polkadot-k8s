#!/bin/bash

set -e
set -x

get_node_id() {
    node_id=$(cat /polkadot/k8s_node_ids/$1)
    printf '%s\n' "--sentry /dns4/$1.$KUBERNETES_NAME_PREFIX-private-node/tcp/30333/p2p/$node_id"
}

sentry_param=$(get_node_id "$KUBERNETES_NAME_PREFIX-private-node-0")

if [ ! -z "$TELEMETRY_URL" ]; then
    telemetry_url_param="--telemetry-url \"$TELEMETRY_URL 0\""
fi

if [ ! -z "$CHAIN" ]; then
    chain_param="--chain \"$CHAIN\""
fi

eval /usr/local/bin/polkadot --pruning=archive --wasm-execution Compiled \
         --unsafe-ws-external \
         --unsafe-rpc-external \
         --prometheus-external \
         --rpc-methods=Unsafe \
         --rpc-cors=all \
         --node-key-file /polkadot/k8s_local_node_key \
         $sentry_param $node_key_param \
         $telemetry_url_param \
         $chain_param
