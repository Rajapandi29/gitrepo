output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.app.id
}

output "public_ip" {
  description = "Public IP address of the EC2 instance."
  value       = aws_instance.app.public_ip
}

output "application_url" {
  description = "URL for the application."
  value       = "http://${aws_instance.app.public_ip}:8094"
}
