# Pre-existing kubernetes cluster

You may want to deploy the validator setup in a kubernetes cluster that already exists.

In that case:

* set the `kubernetes_config_context` variable to the context of your target cluster. To list local contexts, do `kubectl config get-contexts` or look at `~/.kube/config`
* set the `project` variable to the GCP project where the cluster is located
* `terraform init` / `terraform plan` / `terraform apply`
