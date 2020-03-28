#!/bin/sh

set -e
set -x

sentry_node_0_node_id=$(curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "system_networkState"}' http://polkadot-sentry-node-0.polkadot-sentry-node:9933/ | jq -r '.result.peerId')
sentry_node_1_node_id=$(curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "system_networkState"}' http://polkadot-sentry-node-1.polkadot-sentry-node:9933/ | jq -r '.result.peerId')

/usr/local/bin/polkadot --validator --name "🐑 Hodl_dot_farm 🐑" --pruning=archive --wasm-execution Compiled \
         --listen-addr=/ip4/10.0.0.1/tcp/30333 \
         --reserved-nodes /ip4/polkadot-sentry-node-0.polkadot-sentry-node/tcp/30333/p2p/${sentry_node_0_node_id} \
         --reserved-nodes /ip4/polkadot-sentry-node-1.polkadot-sentry-node/tcp/30333/p2p/${sentry_node_1_node_id}
