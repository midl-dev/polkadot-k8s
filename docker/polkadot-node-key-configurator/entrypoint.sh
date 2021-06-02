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

# write public keys for all peers in an env file, to be sourced by polkadot startup script
local_peers=("${LOCAL_PEERS}")
for node in ${local_peers[@]}
do
    echo $(subkey inspect-node-key --file /polkadot-node-keys/$node) > /polkadot/k8s_node_ids/$node
done
