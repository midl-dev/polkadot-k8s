#!/bin/bash

set -e
set -x

get_node_id() {
    #Attempt to fetch node id from sentry peers...

    curl_node_id=$(curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "system_networkState"}' http://$1:9933/ | jq -r '.result.peerId')
    if [ -z $curl_node_id ]; then
        #Peer seems offline, getting peer id from persistent storage
        if [ -f /polkadot/polkadot-k8s/$1 ]; then
            printf $(cat /polkadot/polkadot-k8s/$1)
            #Else, peer unreachable and no persistent record available so we return nothing and expect liveness check to fail
        fi
    else
        if ! [ "$(cat /polkadot/polkadot-k8s/$1)" == "$curl_node_id" ]; then
            # Putting node id in persistent storage if not there already
            mkdir -p /polkadot/polkadot-k8s
            printf $curl_node_id > /polkadot/polkadot-k8s/$1
        fi
        printf $curl_node_id
    fi
}

sentry_node_0_node_id=$(get_node_id "polkadot-sentry-node-0.polkadot-sentry-node")
sentry_node_1_node_id=$(get_node_id "polkadot-sentry-node-1.polkadot-sentry-node")

/usr/local/bin/polkadot --validator --name "🐑 Hodl_dot_farm 🐑" --pruning=archive --wasm-execution Compiled \
         --out-peers=2 \
         --in-peers=2 \
         --reserved-only \
         --reserved-nodes /dns4/polkadot-sentry-node-0.polkadot-sentry-node/tcp/30333/p2p/${sentry_node_0_node_id} \
         --reserved-nodes /dns4/polkadot-sentry-node-1.polkadot-sentry-node/tcp/30333/p2p/${sentry_node_1_node_id}
