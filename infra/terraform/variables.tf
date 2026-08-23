variable "project_id" {
  description = "GCP project ID (not the display name)."
  type        = string
}

variable "region" {
  description = "Primary region for Cloud Run, Artifact Registry, and networking."
  type        = string
  default     = "us-central1"
}

variable "name_prefix" {
  description = "Short prefix for resource names."
  type        = string
  default     = "devhub"
}

variable "api_image" {
  description = "Full Artifact Registry image URL for the API (tag included)."
  type        = string
}

variable "web_image" {
  description = "Full Artifact Registry image URL for the frontend nginx image."
  type        = string
}

variable "db_tier" {
  description = "Cloud SQL machine tier. db-f1-micro is cheapest for learning."
  type        = string
  default     = "db-f1-micro"
}

variable "redis_memory_size_gb" {
  description = "Memorystore Redis size in GiB (minimum 1)."
  type        = number
  default     = 1
}

variable "jwt_secret_value" {
  description = "JWT signing secret. Prefer leaving null to auto-generate."
  type        = string
  default     = null
  sensitive   = true
}
