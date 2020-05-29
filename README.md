# Polkadot-k8s

This project deploys a fully featured, best practices [Polkadot](https://polkadot.network) or [Kusama](https://kusama.network) validator setup on Google Kubernetes Engine.

Features:

* compatible with Kusama and Polkadot
* high availability and geographical distribution
* download and import a [pre-synced database](https://dotleap.com/how-to-import-a-pre-synced-kusama-database/) for faster synchronization of the node
* node monitoring with [PANIC polkadot alerter](https://github.com/SimplyVC/panic_polkadot)
* deploy everything in just one command - no prior knowledge of Kubernetes required

TODO:

* automated payout cronjob
* support for on-prem remote signer [whenever available](https://github.com/paritytech/substrate/issues/4689)
* node key autogeneration

Brought to you by MIDL.dev
--------------------------

<img src="midl-dev-logo.png" alt="MIDL.dev" height="100"/>

We help you deploy and manage a complete Polkadot or Kusama validator infrastructure for you. [Hire us](https://midl.dev).

Architecture
------------

This is a Kubernetes private cluster with two nodes located in two Google Cloud zones, in the same region.

The sentry nodes are a StatefulSet of two pods, one in each zone. They connect to the peer-to-peer network.

A private validator node performs validation operations and generates blocks. It connects exclusively to the two public nodes belonging to the cluster.

The validator node uses a [Regional Persistent Disk](https://cloud.google.com/compute/docs/disks/#repds) so it can be respun quickly in the other node from the pool if the first node goes offline for any reason, for example base OS upgrade.

The setup is production hardened:
* usage of kubernetes secrets to store sensitive values such as node keys. They are created securely from terraform variables,
* network policies to restrict communication between pods. For example, only sentries can peer with the validator node.

## Costs

Deploying will incur Google Compute Engine charges, specifically:

* virtual machines
* regional persistent SSD storage
* network ingress
* NAT forwarding

# How to deploy

*WARNING: Polkadot/Kusama tokens have value. Use judgement and care in your network interactions, otherwise loss of funds may occur.*

## Prerequisites

1. Download and install [Terraform](https://terraform.io)

1. Download, install, and configure the [Google Cloud SDK](https://cloud.google.com/sdk/).

1. Install the [kubernetes
   CLI](https://kubernetes.io/docs/tasks/tools/install-kubectl/) (aka
   `kubectl`)

## Authentication

Using your Google account, active your Google Cloud access.

Login to gcloud using `gcloud auth login`

Set up [Google Default Application Credentials](https://cloud.google.com/docs/authentication/production) by issuing the command:

```
gcloud auth application-default login
```

NOTE: for production deployments, the method above is not recommended. Instead, you should use a Terraform service account following [these instructions](docs/production-hardening.md).

## Bond your tokens

Follow [these instructions](https://wiki.polkadot.network/docs/en/maintain-guides-how-to-validate-kusama#bond-ksm) to bond your KSM.

NOTE: the link above points to the official guide about [how to validate on Kusama](https://wiki.polkadot.network/docs/en/maintain-guides-how-to-validate-kusama). Not every action in this guide needs to be performed. For example, there is no need to build binaries.

## Populate terraform variables

All custom values unique to your deployment are set as terraform variables. You must populate these variables manually before deploying the setup.

A simple way is to populate a file called `terraform.tfvars` in the `terraform` folder.

NOTE: `terraform.tfvars` is not recommended for a production deployment. See [production hardening](docs/production-hardening.md).

### Network (libp2p) keys (optional)

These keys are needed for the validator to communicate to its sentries. You may pass them as a variabe, or Terraform will generate them for you.

If you want to pass them, the syntax is:

```
polkadot_node_keys = {
  "polkadot-private-node-0": "b5ca09a5dccb48d5c7915f24223454fe1a557383ba0b1560cc3ed919a6e9dec5",
  "polkadot-sentry-node-0": "dcf609b50868ffe379d4a992cf866deba8ad84ecca24853bacba1171ae7cdf22",
  "polkadot-sentry-node-1": "ca62cb1bae8c84090f2e20dae81c79f8843fb75df065c8026e4603b85b48729f"
}
```

### PANIC alerter variables

PANIC performs monitoring of your cluster and alerts you on a telegram channel when something is wrong with your nodes.

Enter your stash account identifier under `polkadot_stash_account_address`. PANIC will monitor validation operations of this address.

Create a telegram channel and a bot that can post to it. Populate `telegram_alert_chat_id` and `telegram_alert_chat_token`

### Polkadot utility parameters

Set the `polkadot_version` to the desired version of polkadot container.

Set the `chain` variable to the desired network you want to launch (`polkadot` or `kusama`).

Set the `polkadot_telemetry_url` variable to the telemetry server websocket endpoint (that you would pass to polkadot's `--telemetry-url` option)

Set the `polkadot_validator_name` to your validator name as you want it to appear on telemetry (maps to polkadot's `--name` parameter).

### Archive URL (optional)

If you have an archive of the node storage, you can put the URL here. It will make the initial deployment of the nodes faster. It must be in `7z` format.

See [a resource on how to get a pre-synced archive databsae for Kusama](https://dotleap.com/how-to-import-a-pre-synced-kusama-database/).

### Google Cloud project

A default Google Cloud project should have been created when you activated your account. Verify its ID with `gcloud projects list`. You may also create a dedicated project to deploy the cluster.

Set the project id in the `project` terraform variable.

NOTE: if you created a [terraform service account](docs/production-hardening.md), leave this variable empty.

### Recap : full example of terraform.tfvars file

```
project="beaming-essence-301841"
polkadot_archive_url="https://ipfs.io/ipfs/Qma3fM33cw4PGiw28SidqhFi3CXRa2tpywqLmhYveabEYQ?filename=Qma3fM33cw4PGiw28SidqhFi3CXRa2tpywqLmhYveabEYQ"
polkadot_validator_name="Hello from k8s!"
polkadot_version="v0.8.0"
chain="kusama"
polkadot_telemetry_url="wss://telemetry-backend.w3f.community/submit"
telegram_alert_chat_id="-486750097"
telegram_alert_chat_token="1273059891:ABEzzzzzzzzzzzzzzzzzzzzzzzz"
polkadot_stash_account_address = "D3bm5iAeeRezwZp4tWTX4sZN9u8nXy2Fo21U59smznYHF3F"
```

The example above would:
* deploy a validator setup in the Google Cloud project named `beaming-essence-301841`
* download a kusama snapshot from IPFS
* report to telemetry server `w3f.community` under the name `Hello from k8s!`
* send alerts to a telegram chat

## Deploy!

1. Run the following:

```
cd terraform

terraform init
terraform plan -out plan.out
terraform apply plan.out
```

This will take time as it will:
* create a Kubernetes cluster
* build the necessary containers
* download and unzip the archives if applicable
* spin up the sentry and validator nodes
* sync the network

### Connect to the cluster

After apply is complete, your `kubectl` command should point to the correct cluster. You can then issue `kubectl get pods` and observe that your Polkadot nodes are now alive and syncing.

When you display the logs of your private node, you will see it syncing:

```
kubectl  logs -f polkadot-private-node-0 --tail=10
```

### How to check your validator node is running ?

* connect to your telemetry server and search for your node by name
* look at alerts in the PANIC telegram channel
* set up a websocket tunnel to your local host

```
kubectl port-forward polkadot-private-node-0 9944:9944
```

Then go to the [Polkadot Js app](https://polkadot.js.org/apps/#/) and configure it to point to `localhost:9944`. You should see your node syncing.

### Inject session keys

[Follow instructions](https://wiki.polkadot.network/docs/en/maintain-guides-how-to-validate-kusama#set-session-keys) to inject session keys using the Polkadot Js app.

### Validate

[Follow instructions](https://wiki.polkadot.network/docs/en/maintain-guides-how-to-validate-kusama#validate)


## I have a kubernetes cluster already, I just want to deploy to it

[Instructions here](docs/pre-existing-cluster.md)

Apply an update
---------------

If you have pulled the most recent version of `polkadot-k8s` and wish to apply updates, issue the following commands:

```
terraform taint null_resource.push_containers && terraform taint null_resource.apply && terraform plan -out plan.out
terraform apply plan.out
```

This will rebuild the containers, then apply the kubernetes changes.

If you want to upgrade the polkadot containers version, edit the version number in `terraform.tfvars`, then issue the commands above.

The pods may or may not restart on their own, depending on what changed since last deployment. To force a restart, issue:

```
kubectl delete pod polkadot-sentry-node-0
kubectl delete pod polkadot-sentry-node-1
kubectl delete pod polkadot-private-node-0
```

Look at the logs and ensure each pod comes back online before deleting the next one.

NOTE: since these pods are part of Deployment/StatefulSet, kubernetes auto-restarts them when you delete them. Their storage is persisted so they restart where they left off.

## Wrapping up

To delete everything and terminate all the charges, issue the command:

```
terraform destroy
```

Alternatively, go to the GCP console and delete the project.
