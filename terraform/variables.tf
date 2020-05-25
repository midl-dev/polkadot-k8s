terraform {
  required_version = ">= 0.12"
}

variable "polkadot_archive_url" {
  type        = string
  description = "archive url"
}

variable "polkadot_telemetry_url" {
  type        = string
  description = "url of the telemetry server the polkadot nodes report to"
}

variable "polkadot_validator_name" {
  type        = string
  description = "name of the validator shown on the public telemetry server"
}

variable "polkadot_node_ids" {
  type = map
  description = "map between hostname of polkadot nodes and their node ids. todo: derive from keys using a subkey container once https://github.com/paritytech/substrate/issues/5778 is implemented"
}

variable "polkadot_node_keys" {
  type = map
  description = "map between hostname of polkadot nodes and their node keys"
}

variable "project" {
  type        = string
  default     = ""
  description = "Project ID where Terraform is authenticated to run to create additional projects. If provided, Terraform will create the GKE cluster inside this project. If not given, Terraform will generate a new project."
}

variable "org_id" {
  type        = string
  description = "Organization ID."
  default = ""
}

variable "billing_account" {
  type        = string
  description = "Billing account ID."
  default = ""
}

variable "kubernetes_config_context" {
  type = string
  description = "name of the kubernetes context where to create the deployment. Only set when you already have an existing cluster"
}

variable "terraform_service_account_credentials" {
  type = string
  description = "path to terraform service account file, created following the instructions in https://cloud.google.com/community/tutorials/managing-gcp-projects-with-terraform"
  default = "~/.config/gcloud/application_default_credentials.json"
}

variable "telegram_alert_chat_id" {
  type = string
  description = "chat id for polkadot panic alerter"
}

variable "telegram_alert_chat_token" {
  type = string
  description = "the secret token for telegram panic alerter"
}

variable "polkadot_stash_account_address" {
  type = string
  description = "the stash address"
}
