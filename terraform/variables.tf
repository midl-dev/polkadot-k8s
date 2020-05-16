terraform {
  required_version = ">= 0.12"
}

variable "polkadot_archive_url" {
  type        = string
  description = "archive url"
}

variable "sentry_0_node_key" {
  type = string
  description = "libp2p node id secret key (in hex, 64 hex characters)."
}

variable "sentry_1_node_key" {
  type = string
  description = "libp2p node id secret key (in hex, 64 hex characters)."
}

variable "private_node_key" {
  type = string
  description = "libp2p node id secret key (in hex, 64 hex characters)."
}

variable "project" {
  type = string
  description = "the gcp project"
}
