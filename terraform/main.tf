resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}
resource "aws_subnet" "public_1" {
  vpc_id = aws_vpc.main.id

  cidr_block = var.public_subnet_1_cidr

  availability_zone = var.availability_zone_1

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-1"
  }
}

resource "aws_subnet" "public_2" {
  vpc_id = aws_vpc.main.id

  cidr_block = var.public_subnet_2_cidr

  availability_zone = var.availability_zone_2

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-2"
  }
}
resource "aws_subnet" "private_1" {
  vpc_id = aws_vpc.main.id

  cidr_block = var.private_subnet_1_cidr

  availability_zone = var.availability_zone_1

  tags = {
    Name = "${var.project_name}-private-1"
  }
}

resource "aws_subnet" "private_2" {
  vpc_id = aws_vpc.main.id

  cidr_block = var.private_subnet_2_cidr

  availability_zone = var.availability_zone_2

  tags = {
    Name = "${var.project_name}-private-2"
  }
}
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"

    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}
resource "aws_route_table_association" "public_1" {
  subnet_id = aws_subnet.public_1.id

  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id = aws_subnet.public_2.id

  route_table_id = aws_route_table.public.id
}
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id

  subnet_id = aws_subnet.public_1.id

  depends_on = [
    aws_internet_gateway.main
  ]

  tags = {
    Name = "${var.project_name}-nat"
  }
}
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"

    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-private-rt"
  }
}
resource "aws_route_table_association" "private_1" {
  subnet_id = aws_subnet.private_1.id

  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id = aws_subnet.private_2.id

  route_table_id = aws_route_table.private.id
}
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })
}
resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role = aws_iam_role.ecs_execution.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_security_group" "alb" {
  name = "${var.project_name}-alb-sg"

  description = "Application Load Balancer security group"

  vpc_id = aws_vpc.main.id

  ingress {
    description = "HTTP"

    from_port = 80
    to_port   = 80

    protocol = "tcp"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }

  egress {
    from_port = 0
    to_port   = 0

    protocol = "-1"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }
}
resource "aws_security_group" "frontend" {
  name = "${var.project_name}-frontend-sg"

  description = "Frontend ECS security group"

  vpc_id = aws_vpc.main.id

  ingress {
    description = "Frontend from ALB"

    from_port = 80
    to_port   = 80

    protocol = "tcp"

    security_groups = [
      aws_security_group.alb.id
    ]
  }

  egress {
    from_port = 0
    to_port   = 0

    protocol = "-1"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }
}
resource "aws_security_group" "backend" {
  name = "${var.project_name}-backend-sg"

  description = "Backend ECS security group"

  vpc_id = aws_vpc.main.id

  ingress {
    description = "Backend traffic"

    from_port = 3000
    to_port   = 3000

    protocol = "tcp"

    security_groups = [
      aws_security_group.frontend.id
    ]
  }

  egress {
    from_port = 0
    to_port   = 0

    protocol = "-1"

    cidr_blocks = [
      "0.0.0.0/0"
    ]
  }
}
resource "aws_lb" "main" {
  name = "${var.project_name}-alb"

  load_balancer_type = "application"

  internal = false

  security_groups = [
    aws_security_group.alb.id
  ]

  subnets = [
    aws_subnet.public_1.id,
    aws_subnet.public_2.id
  ]

  tags = {
    Name = "${var.project_name}-alb"
  }
}
resource "aws_lb_target_group" "frontend" {
  name = "${var.project_name}-frontend-tg"

  port = var.frontend_port

  protocol = "HTTP"

  target_type = "ip"

  vpc_id = aws_vpc.main.id

  health_check {
    path = "/"

    protocol = "HTTP"

    matcher = "200-399"
  }
}
resource "aws_lb_listener" "frontend" {
  load_balancer_arn = aws_lb.main.arn

  port = 80

  protocol = "HTTP"

  default_action {
    type = "forward"

    target_group_arn = aws_lb_target_group.frontend.arn
  }
}
resource "aws_cloudwatch_log_group" "frontend" {
  name = "/ecs/${var.project_name}/frontend"

  retention_in_days = 7
}
resource "aws_cloudwatch_log_group" "backend" {
  name = "/ecs/${var.project_name}/backend"

  retention_in_days = 7
}
resource "aws_ecs_task_definition" "frontend" {
  family = "${var.project_name}-frontend"

  network_mode = "awsvpc"

  requires_compatibilities = [
    "FARGATE"
  ]

  cpu = "256"

  memory = "512"

  execution_role_arn = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name = "frontend"

      image = var.frontend_image

      essential = true

      portMappings = [
        {
          containerPort = var.frontend_port

          hostPort = var.frontend_port

          protocol = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "frontend"
        }
      }
    }
  ])
}
resource "aws_ecs_service" "frontend" {
  name = "${var.project_name}-frontend"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.frontend.arn

  desired_count = 2

  launch_type = "FARGATE"

  network_configuration {
    subnets = [
      aws_subnet.private_1.id,
      aws_subnet.private_2.id
    ]

    security_groups = [
      aws_security_group.frontend.id
    ]

    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn

    container_name = "frontend"

    container_port = var.frontend_port
  }

  depends_on = [
    aws_lb_listener.frontend
  ]
}
resource "aws_ecs_task_definition" "backend" {
  family = "${var.project_name}-backend"

  network_mode = "awsvpc"

  requires_compatibilities = [
    "FARGATE"
  ]

  cpu = "256"

  memory = "512"

  execution_role_arn = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name = "backend"

      image = var.backend_image

      essential = true

      portMappings = [
        {
          containerPort = var.backend_port

          hostPort = var.backend_port

          protocol = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"

        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "backend"
        }
      }
    }
  ])
}
resource "aws_ecs_service" "backend" {
  name = "${var.project_name}-backend"

  cluster = aws_ecs_cluster.main.id

  task_definition = aws_ecs_task_definition.backend.arn

  desired_count = 2

  launch_type = "FARGATE"

  network_configuration {
    subnets = [
      aws_subnet.private_1.id,
      aws_subnet.private_2.id
    ]

    security_groups = [
      aws_security_group.backend.id
    ]

    assign_public_ip = false
  }
}
