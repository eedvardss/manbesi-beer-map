variable "project_id" {
  description = "GCP project ID that hosts the platform."
  type        = string
}

variable "region" {
  description = "GCP region for the cluster, subnet and backup bucket."
  type        = string
  default     = "europe-north1"
}

variable "billing_account_id" {
  description = "Billing account ID (XXXXXX-XXXXXX-XXXXXX) that pays for the project. Its currency must be EUR."
  type        = string
}

variable "budget_amount" {
  description = "Monthly budget in EUR; alerts fire at 50%, 90% and 100%."
  type        = number
  default     = 50
}

variable "deletion_protection" {
  description = "Block deletion of the cluster. Set to false only to tear the platform down."
  type        = bool
  default     = true
}
