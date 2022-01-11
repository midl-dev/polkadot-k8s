# Polkadot helm chart

This deploys a polkadot node.

It can:

* sync from a filesystem archive
* configure its own host key passed as parameter
* connect to other nodes in different namespaces in a full mesh
* deploy a network load balancer for p2p ingress in a cloud setup

## How to deploy

See values.yaml comments for detailed explanation of all possible values.

## Example

Deploy val1 chart in namespace `val1`:

```
polkadot_validator_name: "val1"
polkadot_archive_url: null
p2p_ip: 10.0.0.1
p2p_port: 30333
local_nodes:
  nico: 9cd2bad53ae93f45ae19d62f7961679972b9099935ce29d00c2e23efbf2c40bf
  nico2: 9cd2bad53ae93f45ae19d62f7961679972b9099935ce29d00c2e23efbf2c40be
```

Deploy val2 chart in namespace `val2`:

```
polkadot_validator_name: "val2"
polkadot_archive_url: null
p2p_ip: 10.0.0.1
p2p_port: 30334
local_nodes:
  nico: 9cd2bad53ae93f45ae19d62f7961679972b9099935ce29d00c2e23efbf2c40bf
  nico2: 9cd2bad53ae93f45ae19d62f7961679972b9099935ce29d00c2e23efbf2c40be
```

These 2 validators will extablish p2p peering with each other.
