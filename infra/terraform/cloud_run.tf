# API Cloud Run service.
resource "google_cloud_run_v2_service" "api" {
  name     = "${var.name_prefix}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "3600s"

    containers {
      image = var.api_image

      ports {
        container_port = 8080
      }

      env {
        name  = "PORT"
        value = "8080"
      }
      env {
        name  = "DEBUG"
        value = "false"
      }
      env {
        name  = "RUN_SEED"
        value = "true"
      }
      env {
        name  = "CORS_ORIGINS"
        value = "[]"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_url.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        initial_delay_seconds = 10
        period_seconds        = 5
        failure_threshold     = 12
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.runtime_secrets,
    google_project_service.services,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = google_cloud_run_v2_service.api.project
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

locals {
  # Strip https:// prefix from the API URI for nginx upstream host.
  api_hostname = replace(google_cloud_run_v2_service.api.uri, "https://", "")
}

# Frontend Cloud Run — nginx proxies /api to the API service over HTTPS.
resource "google_cloud_run_v2_service" "web" {
  name     = "${var.name_prefix}-web"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.runtime.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    timeout = "3600s"

    containers {
      image = var.web_image

      ports {
        container_port = 8080
      }

      env {
        name  = "LISTEN_PORT"
        value = "8080"
      }
      env {
        name  = "BACKEND_SCHEME"
        value = "https"
      }
      env {
        name  = "BACKEND_UPSTREAM"
        value = local.api_hostname
      }
      env {
        name  = "BACKEND_HOST"
        value = local.api_hostname
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }
    }
  }

  depends_on = [
    google_cloud_run_v2_service.api,
    google_project_service.services,
  ]
}

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = google_cloud_run_v2_service.web.project
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
