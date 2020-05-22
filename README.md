# Polkadot-k8s

[Polkadot](https://polkadot.network) is a proof-of-stake blokchain protocol that has yet to launch. At the moment, its wild cousin, [Kusama](https://kusama.network) is live.

This project deploys a fully featured, best practices Kusama validator setup on Google Kubernetes Engine.

Features:

* GKE supported out-of-the-box today
* high availability and geographical distribution
* download and import a snapshot for faster synchronization of the node
* node monitoring with [PANIC polkadot alerter](https://github.com/SimplyVC/panic_polkadot)
* deploy everything in just one command

Brought to you by MIDL.dev
--------------------------

![MIDL.dev](midl-dev-logo.png)

We can deploy and manage a complete Polkadot or Kusama validator infrastructure for you. [Hire us](https://midl.dev).

Architecture
------------

This is a Kubernetes private cluster with two nodes located in two Google Cloud zones, in the same region.

The sentry nodes are a StatefulSet of two pods, one in each zone. They connect to the peer-to-peer network.

A private validator node performs validation operations and generates blocks. It connects exclusively to the two public nodes belonging to the cluster.

# How to deploy

## Prerequisites

1. Download and install [Terraform](https://terraform.io)

1. Download, install, and configure the [Google Cloud SDK](https://cloud.google.com/sdk/). You will need
   to configure your default application credentials so Terraform can run. It
   will run against your default project, but all resources are created in the
   (new) project that it creates.

1. Install the [kubernetes
   CLI](https://kubernetes.io/docs/tasks/tools/install-kubectl/) (aka
   `kubectl`)

## Become a validator

There is an official guide on [how to validate on Kusama]. You will need to follow sections of this guide, but not everything. Some of the actions are done automatically by our code.

## Bond your tokens

Follow [these instructions](https://wiki.polkadot.network/docs/en/maintain-guides-how-to-validate-kusama#bond-ksm) to bond your KSM.

## Populate terraform variables

All custom values unique to your deployment are set as terraform variables. You must populate these variables manually before deploying the setup.

A simple way is to populate a file called `terraform.tfvars` in the terraform folder.

This file is in `.gitignore`, however make sure to never commit it.

For a production deployment, consider using a secure key-value store such as Hashicorp Vault.

### Network (libp2p) keys

You need to generate node keys for the validator to communicate securely with its sentries.

This is done as a manual method for now. When [this substrate task](https://github.com/paritytech/substrate/issues/5778) is implemented, it will be automated.

1. Install [subkey](https://substrate.dev/docs/en/ecosystem/subkey)

1. Run the following : `./target/debug/subkey --network kusama generate-node-key /tmp/privkey  && cat /tmp/privkey | xxd -p | tr -d '\n' && rm /tmp/privkey`. The first line output will be the key hash (or node_id), the second line output will be the private key (or node_key).

1. Record the keys and hashes in `terraform.tfvars` as follows:

```
polkadot_node_ids = {
  "polkadot-private-node-0": "QmXjjWVEqH2e4yM3amzAC4buJvgkd2B6EfnoHprQ2jSVc7",
  "polkadot-sentry-node-0": "QmSiTWRDU44yUK8wG3xhS1XYfUYJqskVtf5eUsVVKYc3M4",
  "polkadot-sentry-node-1": "Qmchxx8Q3cywVkdDG43J2qR7Bcpj9XFty8Tm2BgRH2efhd"
}
polkadot_node_keys = {
  "polkadot-private-node-0": "b5ca09a5dccb48d5c7915f24223454fe1a557383ba0b1560cc3ed919a6e9dec5",
  "polkadot-sentry-node-0": "dcf609b50868ffe379d4a992cf866deba8ad84ecca24853bacba1171ae7cdf22",
  "polkadot-sentry-node-1": "ca62cb1bae8c84090f2e20dae81c79f8843fb75df065c8026e4603b85b48729f"
}
```

### Stash account

Create the stash and controller accounts for your validator node.

Enter your stash account identifier.

### Archive URL (optional)

If you have an archive of the node storage, you can put the URL here. It will make the initial deployment of the nodes faster. It must be in `tar.xz4` format.

## Deploy!

You need a Google Cloud Organization. You will be able to create one as an individual by registering a domain name.

You need to use a gcloud account as a user that has permission to create new projects. See [instructions for Terraform service account creation](https://cloud.google.com/community/tutorials/managing-gcp-projects-with-terraform) from Google.

1. Collect the necessary information and put it in `terraform.tfvars`

1. Run the following:

```
cd terraform

# The next 6 lines are only necessary if you are using a terraform service account.
# Alternatively, create a project manually and pass it as parameter.
export TF_VAR_org_id=YOUR_ORG_ID
export TF_VAR_billing_account=YOUR_BILLING_ACCOUNT_ID
export TF_ADMIN=${USER}-terraform-admin
export TF_CREDS=~/.config/gcloud/${USER}-terraform-admin.json
export GOOGLE_APPLICATION_CREDENTIALS=${TF_CREDS}
export GOOGLE_PROJECT=${TF_ADMIN}

terraform init
terraform plan -out plan.out
terraform apply plan.out
```

This will take time as it will:
* create a Google Cloud project
* create a Kubernetes cluster
* build the necessary containers locally
* spin up the public nodes and private baker nodes

Apply an update
---------------

If you have pulled the most recent version of `polkadot-k8s` and wish to apply updates, you may do so with a `terraform taint`:

```
terraform taint null_resource.push_containers && terraform taint null_resource.apply && terraform plan -out plan.out
terraform apply plan.out
```

This will rebuild the containers locally, then do a `kubectl apply` to push the most recent changes to your cluster.

The daemons will restart after some time. However, you may kill the pods to restart them immediately.
