output "artifact_registry" {
  description = "Base path for docker tags: REGION-docker.pkg.dev/PROJECT/devhub"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "api_url" {
  description = "Direct Cloud Run URL for the API."
  value       = google_cloud_run_v2_service.api.uri
}

output "web_url" {
  description = "Public SPA URL — open this in a browser."
  value       = google_cloud_run_v2_service.web.uri
}

output "redis_host" {
  description = "Memorystore host (private IP)."
  value       = google_redis_instance.cache.host
  sensitive   = true
}

output "cloud_sql_connection" {
  description = "Cloud SQL instance connection name."
  value       = google_sql_database_instance.postgres.connection_name
}
