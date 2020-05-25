variable "kubernetes_config_context" {
  validation {
    condition     = length(var.kubernetes_config_context) > 0
    error_message = "The variable kubernetes_config_context must be set to deploy in an existing k8s cluster"
  }
}

