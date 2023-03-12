# Define the Docker Compose file
resource "docker_compose_project" "app" {
  name  = "nodemongo"
  file  = "${path.module}/docker-compose.yml"
}

# Start the containers
resource "docker_compose_service" "app" {
  name   = "app"
  project_name = "${docker_compose_project.app.name}"
  depends_on = ["mongo"]

  # Map the ports
  ports {
    internal = 3000
    external = 3000
  }
}

resource "docker_compose_service" "mongo" {
  name   = "mongo"
  project_name = "${docker_compose_project.app.name}"

  # Map the ports
  ports {
    internal = 27017
    external = 27017
  }

  # Mount the data volume
  volumes {
    container_path = "/data/db"
    host_path      = "${path.module}/data"
    read_only      = false
  }
}
