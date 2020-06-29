module "terraform-gke-blockchain" {
  source = "./empty_module"
  project = var.project
  region = var.region
  kubernetes_endpoint = var.kubernetes_endpoint
  cluster_ca_certificate = var.cluster_ca_certificate
  cluster_name = var.cluster_name
  kubernetes_access_token = var.kubernetes_access_token
}

# This file contains all the interactions with Kubernetes
provider "kubernetes" {
  load_config_file = false
  host             = module.terraform-gke-blockchain.kubernetes_endpoint
  cluster_ca_certificate = module.terraform-gke-blockchain.cluster_ca_certificate
  token = module.terraform-gke-blockchain.kubernetes_access_token
}

