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
rm -rvf /polkadot/k8s_local_peer_cmd
for node in ${local_peers[@]}
do
    # do not peer with myself
    if [ "${node}" != "${KUBERNETES_NAME_PREFIX}" ]
    then
        if [ ! -f /polkadot/k8s_local_peer_cmd ]; then
            echo "--reserved-nodes " > /polkadot/k8s_local_peer_cmd
        fi
        echo "/dns4/${node}-private-node-0.${node}-private-node.${node}/tcp/30333/p2p/$(subkey inspect-node-key --file /polkadot-node-keys/$node) " >> /polkadot/k8s_local_peer_cmd
    fi
done
