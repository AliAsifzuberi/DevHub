resource "random_password" "db" {
  length  = 24
  special = false
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.name_prefix}-pg"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = false

  depends_on = [
    google_service_networking_connection.private_vpc,
    google_project_service.services,
  ]
}

resource "google_sql_database" "devhub" {
  name     = "devhub"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "devhub" {
  name     = "devhub"
  instance = google_sql_database_instance.postgres.name
  password = random_password.db.result
}

resource "google_redis_instance" "cache" {
  name               = "${var.name_prefix}-redis"
  tier               = "BASIC"
  memory_size_gb     = var.redis_memory_size_gb
  region             = var.region
  authorized_network = google_compute_network.vpc.id
  redis_version      = "REDIS_7_0"
  display_name       = "DevHub Redis"

  depends_on = [google_project_service.services]
}
