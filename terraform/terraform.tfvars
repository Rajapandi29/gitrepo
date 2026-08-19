aws_region  = "us-east-1"

project_name = "plateful"

environment = "production"

vpc_cidr = "10.0.0.0/16"

public_subnet_1_cidr = "10.0.1.0/24"

public_subnet_2_cidr = "10.0.2.0/24"

private_subnet_1_cidr = "10.0.11.0/24"

private_subnet_2_cidr = "10.0.12.0/24"

availability_zone_1 = "us-east-1a"

availability_zone_2 = "us-east-1b"

frontend_image = "YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/plateful-frontend:latest"

backend_image = "YOUR_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/plateful-backend:latest"

frontend_container_port = 80

backend_container_port = 3000

db_name = "plateful"

db_username = "admin"

db_password = "ChangeThisStrongPassword123!"

ecs_task_cpu = 256

ecs_task_memory = 512