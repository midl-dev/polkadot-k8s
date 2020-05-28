# An empty module.
# We do not want cluster creation to take place, so this is a placeholder for the module that creates a cluster.

variable "project" {
  type = "string"
  description = "project name"
  default = ""
}

output "name" {
  value = ""
}

output "kubernetes_endpoint" {
  value = ""
}

output "cluster_ca_certificate" {
  value = ""
}

output "location" {
  value = ""
}

output "project" {
  value = var.project
}
