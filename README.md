# Polkadot-k8s

For now, a collection of scripts and resources to spin up a polkadot validator set on kubernetes.

This may eventually turn into a turn-key solution just like https://github.com/hodl-dot-farm/tezos-on-gke 

## Populate terraform variables

All custom values unique to your deployment are set as terraform variables. You must populate these variables manually before deploying the setup.

A simple way is to populate a file called `terraform.tfvars` in the terraform folder.

This file is in `.gitignore`, however make sure to never commit it.

For a production deployment, consider using a secure key-value store such as Hashicorp Vault.

### Network (libp2p) keys

You need to generate node keys for the validator to communicate securely with its sentries.

This is done as a manual method for now. When [this substrate task](https://github.com/paritytech/substrate/issues/5778) is implemented, it will be automated.

1. Install [subkey](https://substrate.dev/docs/en/ecosystem/subkey)

1. Run the following : `./target/debug/subkey --network kusama generate-node-key /tmp/cul  && cat /tmp/privkey | xxd -p | tr -d '\n' && rm /tmp/privkey`. The first line output will be the key hash, the second line output will be the private key.

1. Record the keys and hashes in `terraform.tfvars` as follows:

```
polkadot_node_keys = {
  "polkadot-private-node-0": "",
  "polkadot-sentry-node-0": "",
  "polkadot-sentry-node-1": ""
}
polkadot_node_ids = {
  "polkadot-private-node-0": "12D3KooWJub8qqN9J596JtgDHe4WZaHyFskxYb3cBzVQckC5PWW3",
  "polkadot-sentry-node-0": "QmQVH9XE6nfzeWvNLy4kFRAvxYwmvtpn92ScFmJUoJbHno",
  "polkadot-sentry-node-1": "QmXZ9FkrvALeeitbhQMAAQGhfCXb2jDzouHSrZDvxsaQWv"
}
```

### Stash account

Create the stash and controller accounts for your validator node.

Enter your stash account identifier.

### Archive URL (optional)

If you have an archive of the node storage, you can put the URL here. It will make the initial deployment of the nodes faster. It must be in `tar.xz4` format.
