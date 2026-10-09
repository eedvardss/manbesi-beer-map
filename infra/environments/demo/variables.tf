variable "project_id" {
  type    = string
  default = "beermap-devops"
}
variable "region" {
  type    = string
  default = "europe-north1"
}
variable "zone" {
  type    = string
  default = "europe-north1-a"
}
variable "machine_type" {
  type    = string
  default = "e2-standard-4"
}
variable "deletion_protection" {
  type    = bool
  default = true
}
variable "billing_account_id" {
  type = string
}
variable "budget_sek" {
  type    = number
  default = 500
  validation {
    condition     = var.budget_sek > 0 && var.budget_sek <= 500
    error_message = "The initial demonstration budget must be between 1 and 500 SEK."
  }
}
variable "github_repository_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]+$", var.github_repository_id))
    error_message = "Use the immutable numeric GitHub repository ID."
  }
}
variable "github_repository_owner_id" {
  type = string
  validation {
    condition     = can(regex("^[0-9]+$", var.github_repository_owner_id))
    error_message = "Use the immutable numeric GitHub owner ID."
  }
}
