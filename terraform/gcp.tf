module "terraform-gke-blockchain" {
  source = "github.com/midl-dev/terraform-gke-blockchain"
  org_id = var.org_id
  billing_account = var.billing_account
  terraform_service_account_credentials = var.terraform_service_account_credentials
  project = var.project
  project_prefix = "polkadot"
}

# Query the client configuration for our current service account, which should
# have permission to talk to the GKE cluster since it created it.
data "google_client_config" "current" {
}

# This file contains all the interactions with Kubernetes
provider "kubernetes" {
  load_config_file = false
  host             = module.terraform-gke-blockchain.kubernetes_endpoint
  cluster_ca_certificate = module.terraform-gke-blockchain.cluster_ca_certificate
  token = data.google_client_config.current.access_token
}
