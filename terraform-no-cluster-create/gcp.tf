module "terraform-gke-blockchain" {
  source = "./empty_module"
}

# This file contains all the interactions with Kubernetes
provider "kubernetes" {
  config_context = var.kubernetes_config_context
}

