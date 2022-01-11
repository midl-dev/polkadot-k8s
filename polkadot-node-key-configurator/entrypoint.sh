#!/bin/bash

set -e
set -x

rm -vf /polkadot/k8s_local_node_key
rm -rvf /polkadot/k8s_node_ids/
mkdir -p /polkadot/k8s_node_ids

# write private key for this node only and protect it
if [ -f /polkadot-node-keys/${NAMESPACE} ]; then
    cat /polkadot-node-keys/${NAMESPACE} | xxd -r -p > /polkadot/k8s_local_node_key
    # move owner to polkadot
    chown 1000 /polkadot/k8s_local_node_key
    chmod 400 /polkadot/k8s_local_node_key
fi


for node in $(ls /polkadot-node-keys)
do
    # do not peer with myself
    if [ "${node}" != "${NAMESPACE}" ]
    then
        if [ ! -f /polkadot/k8s_local_peer_cmd ]; then
            # write public keys for all peers in an env file, to be sourced by polkadot startup script
            echo "--reserved-nodes " > /polkadot/k8s_local_peer_cmd
        fi
        echo "/dns4/${CHAIN}-node-0.${CHAIN}-node.${node}/tcp/30333/p2p/$(subkey inspect-node-key --file /polkadot-node-keys/$node) " >> /polkadot/k8s_local_peer_cmd
    fi
done
