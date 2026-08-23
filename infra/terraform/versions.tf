# Terraform for DevHub on Google Cloud (Phase 5).
#
# This is infrastructure-as-code: the cloud resources are declared here so a
# teammate (or future you) can recreate the environment instead of clicking
# through the GCP console.
#
# Typical flow (after gcloud auth and a billing-enabled project):
#   cd infra/terraform
#   cp terraform.tfvars.example terraform.tfvars   # edit project_id, etc.
#   terraform init
#   terraform plan
#   terraform apply
#
# Images must already exist in Artifact Registry (build/push separately):
#   docker build -f backend/Dockerfile -t REGION-docker.pkg.dev/PROJECT/devhub/api:latest ./backend
#   docker push ...
#
# See docs/phase-5-cloud.md for the full walkthrough.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Uncomment after creating the state bucket once by hand (chicken-and-egg):
  # backend "gcs" {
  #   bucket = "YOUR_PROJECT-devhub-tfstate"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

data "google_project" "current" {
  project_id = var.project_id
}
