#!/bin/bash

set -e
set -x

if [ -e /polkadot/k8s_local_node_key ]; then
    node_key_param="--node-key-file /polkadot/k8s_local_node_key"
fi

if [ -e /polkadot/k8s_local_peer_cmd ]; then
    local_peer_param="$(cat /polkadot/k8s_local_peer_cmd)"
fi

if [ ! -z "$VALIDATOR_NAME" ]; then
    name_param="--name \"$VALIDATOR_NAME\""
fi

if [ ! -z "$CHAIN" ]; then
    chain_param="--chain \"$CHAIN\""
fi

if [ ! -z "$IN_PEERS" ]; then
    in_peers_param="--in-peers=${IN_PEERS}"
fi

if [ ! -z "$OUT_PEERS" ]; then
    out_peers_param="--out-peers=${OUT_PEERS}"
fi

if [ ! -z "$TELEMETRY_URL" ]; then
    telemetry_url_param="--telemetry-url \"$TELEMETRY_URL 0\""
fi

if [ ! -z "$PUBLIC_MULTIADDR" ]; then
    public_address_param="--public-addr=${PUBLIC_MULTIADDR}"
fi

# sleep 1000
eval /usr/bin/polkadot --validator --wasm-execution Compiled \
         --unsafe-pruning \
         --pruning=1000 \
         --prometheus-external \
          --execution native \
         $out_peers_param \
         $in_peers_param \
         $node_key_param \
         $name_param \
         $telemetry_url_param \
         $chain_param \
         $public_address_param \
         $local_peer_param
