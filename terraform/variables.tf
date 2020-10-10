terraform {
  required_version = ">= 0.12"
}

variable "chain" {
  type = string
  description = "The chain (can be polkadot, kusama)"
  default = "polkadot"
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

variable "polkadot_node_keys" {
  type = map
  description = "map between hostname of polkadot nodes and their node keys"
  default = {}
}

variable "polkadot_version" {
  type = string
  description = "Version of the polkadot containers to use"
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

variable "region" {
  type        = string
  description = "GCP Region. Only necessary when creating cluster manually"
  default = ""
}

variable "node_locations" {
  type        = list
  default     = [ "us-central1-b", "us-central1-f" ]
  description = "Zones in which to create the nodes"
}

variable "billing_account" {
  type        = string
  description = "Billing account ID."
  default = ""
}

variable "kubernetes_namespace" {
  type = string
  description = "kubernetes namespace to deploy the resource into"
  default = "polkadot"
}

variable "kubernetes_name_prefix" {
  type = string
  description = "kubernetes name prefix to prepend to all resources (should be short, like DOT)"
  default = "dot"
}

variable "kubernetes_endpoint" {
  type = string
  description = "name of the kubernetes endpoint"
  default = ""
}

variable "cluster_ca_certificate" {
  type = string
  description = "kubernetes cluster certificate"
  default = ""
}

variable "cluster_name" {
  type = string
  description = "name of the kubernetes cluster"
  default = ""
}

variable "kubernetes_access_token" {
  type = string
  description = "name of the kubernetes endpoint"
  default = ""
}

variable "terraform_service_account_credentials" {
  type = string
  description = "path to terraform service account file, created following the instructions in https://cloud.google.com/community/tutorials/managing-gcp-projects-with-terraform"
  default = "~/.config/gcloud/application_default_credentials.json"
}

variable "monitoring_slack_url" {
  type = string
  default = ""
  description = "slack api url to send prometheus alerts to"
}

variable "kubernetes_pool_name" {
  type = string
  description = "when kubernetes cluster has several node pools, specify which ones to deploy the baking setup into. only effective when deploying on an external cluster with terraform_no_cluster_create"
  default = "blockchain-pool"
}
