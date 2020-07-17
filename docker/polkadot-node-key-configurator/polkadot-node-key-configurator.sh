#!/bin/bash

set -e
set -x

rm -vf /polkadot/k8s_local_node_key
rm -rvf /polkadot/k8s_node_ids/
mkdir -p /polkadot/k8s_node_ids

# write private key for this node only and protect it
cat /polkadot-node-keys/$(hostname) | xxd -r -p > /polkadot/k8s_local_node_key
chown polkadot /polkadot/k8s_local_node_key
chmod 400 /polkadot/k8s_local_node_key

# write public keys for all nodes in an env file, to be sourced by polkadot startup script
nodes=("$KUBERNETES_NAME_PREFIX-private-node-0" "$KUBERNETES_NAME_PREFIX-sentry-node-0" "$KUBERNETES_NAME_PREFIX-sentry-node-1")
for node in ${nodes[@]}
do
    cat /polkadot-node-keys/$node | xxd -r -p - > /tmp/polkadot-key
    echo $(subkey inspect-node-key /tmp/polkadot-key) > /polkadot/k8s_node_ids/$node
    rm -v /tmp/polkadot-key
done
