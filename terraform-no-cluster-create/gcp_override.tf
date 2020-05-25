module "terraform-gke-blockchain" {
  source = "empty-module"
}

# Query the client configuration for our current service account, which should
# have permission to talk to the GKE cluster since it created it.
data "google_client_config" "current" {
}

# This file contains all the interactions with Kubernetes
provider "kubernetes" {
  config_context = var.kubernetes_config_context
}

