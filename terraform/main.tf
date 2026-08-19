data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["137112412989"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_security_group" "plateful" {
  name_prefix = "plateful-web-"
  description = "Access rules for the Plateful application"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Food ordering website"
    from_port   = 8094
    to_port     = 8094
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  dynamic "ingress" {
    for_each = var.key_name == null ? [] : [1]
    content {
      description = "SSH administration"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [var.ssh_cidr]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "plateful" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.plateful.id]
  key_name                    = var.key_name
  associate_public_ip_address = true

  user_data = <<-USERDATA
    #!/bin/bash
    set -euxo pipefail
    dnf update -y
    dnf install -y docker git
    systemctl enable --now docker
    mkdir -p /opt/plateful
    git clone ${var.app_repository} /opt/plateful
    cd /opt/plateful
    curl -L "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    /usr/local/bin/docker-compose up --build -d
  USERDATA

  tags = {
    Name = "plateful-food-ordering"
  }
}

output "ec2_instance_id" {
  description = "ID of the EC2 instance running the application."
  value       = aws_instance.plateful.id
}

output "application_url" {
  description = "Public URL for the deployed application."
  value       = "http://${aws_instance.plateful.public_dns}:8094"
}
