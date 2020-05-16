terraform {
  required_version = ">= 0.12"
}

variable "polkadot_archive_url" {
  type        = string
  description = "archive url"
}

variable "polkadot_node_keys" {
  type = map
  description = "map between hostname of polkadot nodes and their node keys"
}

variable "project" {
  type = string
  description = "the gcp project"
}
