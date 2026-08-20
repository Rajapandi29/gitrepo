variable "aws_region" {
  description = "AWS region in which to run the application."
  type        = string
  default     = "us-east-1"
}

variable "app_repository" {
  description = "Public Git repository containing docker-compose.yml."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance size."
  type        = string
  default     = "t3.micro"
}

