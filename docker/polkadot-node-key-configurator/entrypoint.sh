#!/bin/bash

set -e
set -x

rm -vf /polkadot/k8s_local_node_key
rm -rvf /polkadot/k8s_node_ids/
mkdir -p /polkadot/k8s_node_ids

# write private key for this node only and protect it
cat /polkadot-node-keys/${KUBERNETES_NAME_PREFIX} | xxd -r -p > /polkadot/k8s_local_node_key
# move owner to polkadot
chown 1000 /polkadot/k8s_local_node_key
chmod 400 /polkadot/k8s_local_node_key

# write public keys for all nodes in an env file, to be sourced by polkadot startup script
nodes=("${PEER_NODES}")
for node in ${nodes[@]}
do
    cat /polkadot-node-keys/$node | xxd -r -p - > /tmp/polkadot-key
    echo $(subkey inspect-node-key /tmp/polkadot-key) > /polkadot/k8s_node_ids/$node
    rm -v /tmp/polkadot-key
done
