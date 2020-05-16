#!/bin/bash

set -e
set -x

get_node_id() {
    #Attempt to fetch node id from sentry peers...

    curl_node_id=$(curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "system_networkState"}' http://$1:9933/ | jq -r '.result.peerId')
    if [ -z $curl_node_id ]; then
        #Peer seems offline, getting peer id from persistent storage
        if [ -f /polkadot/polkadot-k8s/$1 ]; then
            printf '%s\n'  "--sentry /dns4/$1/tcp/30333/p2p/$(cat /polkadot/polkadot-k8s/$1)"
            #Else, peer unreachable and no persistent record available so we return nothing and expect liveness check to fail
        fi
    else
        if ! [ "$(cat /polkadot/polkadot-k8s/$1)" == "$curl_node_id" ]; then
            # Putting node id in persistent storage if not there already
            mkdir -p /polkadot/polkadot-k8s
            printf $curl_node_id > /polkadot/polkadot-k8s/$1
        fi
        printf '%s\n' "--sentry /dns4/$1/tcp/30333/p2p/$curl_node_id"
    fi
}

sentry_param=$(get_node_id "polkadot-private-node-0.polkadot-private-node")

/usr/local/bin/polkadot --pruning=archive --wasm-execution Compiled \
         --unsafe-ws-external \
         --unsafe-rpc-external \
         --rpc-methods=Unsafe \
         --rpc-cors=all \
         --telemetry-url 'wss://telemetry-backend.w3f.community/submit 0' \
         $sentry_param
