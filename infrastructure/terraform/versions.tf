terraform {
  required_version = ">= 1.16.0, < 2.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.6.0"
    }
  }

  # Partial configuration: the bucket depends on the project, so pass it at init:
  #   terraform init -backend-config="bucket=<project_id>-tfstate"
  backend "gcs" {
    prefix = "beermap"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
