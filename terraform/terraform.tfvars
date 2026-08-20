aws_region = "us-east-1"

project_name = "plateful"

environment = "production"

vpc_cidr = "10.0.0.0/16"

public_subnet_1_cidr = "10.0.1.0/24"

public_subnet_2_cidr = "10.0.2.0/24"

private_subnet_1_cidr = "10.0.11.0/24"

private_subnet_2_cidr = "10.0.12.0/24"

availability_zone_1 = "us-east-1a"

availability_zone_2 = "us-east-1b"

frontend_image = "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/plateful-frontend:latest"

backend_image = "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/plateful-backend:latest"

frontend_port = 80

backend_port = 3000