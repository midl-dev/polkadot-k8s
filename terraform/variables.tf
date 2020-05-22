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
