variable "aws_region" {
  description = "AWS region in which to run the application."
  type        = string
  default     = "ap-south-1"
}

variable "app_repository" {
  description = "Public Git repository URL containing docker-compose.yml at its root."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance size."
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Optional existing EC2 key pair name for SSH access. Leave null to disable SSH."
  type        = string
  default     = null
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH to the instance when key_name is set."
  type        = string
  default     = "0.0.0.0/0"
}
