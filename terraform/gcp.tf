module "terraform-gke-blockchain" {
  source = "../../terraform-gke-blockchain"
  org_id = var.org_id
  billing_account = var.billing_account
  terraform_service_account_credentials = var.terraform_service_account_credentials
  project = var.project
  project_prefix = "polkadot"
}

