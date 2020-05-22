# Polkadot-k8s

For now, a collection of scripts and resources to spin up a polkadot validator set on kubernetes.

This may eventually turn into a turn-key solution just like https://github.com/hodl-dot-farm/tezos-on-gke 

### Node private key

Libp2p networking will generate a public/private keypair each time a fresh node is started.

This is good behaviour, however, if you want your node id to be hardcoded (for example if the thousand validator programme runs), you can pass the private key as a `--node-key` polkadot argument.

The key is passed as a kubernetes secret.
