resource "random_password" "jwt" {
  count   = var.jwt_secret_value == null ? 1 : 0
  length  = 48
  special = false
}

locals {
  jwt_secret = var.jwt_secret_value != null ? var.jwt_secret_value : random_password.jwt[0].result
  # Cloud SQL private IP + asyncpg. Cloud Run reaches it via the VPC connector.
  database_url = "postgresql+asyncpg://devhub:${random_password.db.result}@${google_sql_database_instance.postgres.private_ip_address}:5432/devhub"
  redis_url    = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}/0"
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "${var.name_prefix}-database-url"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = local.database_url
}

resource "google_secret_manager_secret" "jwt" {
  secret_id = "${var.name_prefix}-jwt"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "jwt" {
  secret      = google_secret_manager_secret.jwt.id
  secret_data = local.jwt_secret
}

resource "google_secret_manager_secret" "redis_url" {
  secret_id = "${var.name_prefix}-redis-url"
  replication {
    auto {}
  }
  depends_on = [google_project_service.services]
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = local.redis_url
}

# Runtime service account for Cloud Run — least privilege: secrets + SQL client.
resource "google_service_account" "runtime" {
  account_id   = "${var.name_prefix}-run"
  display_name = "DevHub Cloud Run runtime"
}

resource "google_secret_manager_secret_iam_member" "runtime_secrets" {
  for_each = {
    database = google_secret_manager_secret.database_url.secret_id
    jwt      = google_secret_manager_secret.jwt.secret_id
    redis    = google_secret_manager_secret.redis_url.secret_id
  }

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_project_iam_member" "runtime_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}
