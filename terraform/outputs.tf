output "alb_dns_name" {
  description = "Application Load Balancer DNS"

  value = aws_lb.main.dns_name
}

output "plateful_url" {
  description = "Plateful application URL"

  value = "http://${aws_lb.main.dns_name}"
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "frontend_service_name" {
  value = aws_ecs_service.frontend.name
}

output "backend_service_name" {
  value = aws_ecs_service.backend.name
}