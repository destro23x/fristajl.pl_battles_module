data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = var.execution_role_name
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Lets the ECS agent (using the execution role) pull the image and ship logs.
# No SSM secret is needed - migration_user_fristajl authenticates via IAM
# (see lambda/db-user-provisioner), so the container itself generates a
# short-lived SigV4 auth token using the *task* role's credentials below.

# The task role (distinct from the execution role) is assumed by the
# container process itself and is what the migrate.sh script's IAM auth
# is signed with. Scoped to rds-db:connect as migration_user_fristajl
# only.
data "aws_iam_policy_document" "task_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task" {
  name               = "${var.execution_role_name}-task"
  assume_role_policy = data.aws_iam_policy_document.task_assume_role.json
  tags               = var.tags
}

data "aws_iam_policy_document" "rds_connect" {
  statement {
    sid       = "ConnectAsMigrationUser"
    actions   = ["rds-db:connect"]
    resources = [var.rds_db_connect_arn]
  }
}

resource "aws_iam_role_policy" "rds_connect" {
  name   = "${var.execution_role_name}-rds-connect"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.rds_connect.json
}

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.family}"
  retention_in_days = var.log_retention_in_days
  tags              = var.tags
}

# The migrate workflow passes the image tag to migrate with as a Terraform
# `-var` on every `atmos terraform apply`, so Terraform stays the sole owner
# of container_definitions - no ignore_changes needed here.
resource "aws_ecs_task_definition" "this" {
  family                   = var.family
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "migrator"
      image     = var.image
      essential = true
      command   = ["./migrate.sh"]

      environment = [
        { name = "RDS_HOST", value = var.db_host },
        { name = "RDS_PORT", value = tostring(var.db_port) },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USER", value = var.db_user },
        { name = "DB_SSL", value = "true" },
        { name = "DB_IAM_AUTH", value = "true" },
        { name = "AWS_REGION", value = var.region }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "migrate"
          awslogs-create-group  = "true"
        }
      }
    }
  ])

  tags = var.tags
}

# Published so a GitHub Actions workflow can look up the network
# configuration for `aws ecs run-task` without hardcoding resource IDs.
resource "aws_ssm_parameter" "subnet_ids" {
  name  = "/fristajl/ecs/${var.family}/subnet-ids"
  type  = "StringList"
  value = join(",", var.subnet_ids)
  tags  = var.tags
}

resource "aws_ssm_parameter" "security_group_id" {
  name  = "/fristajl/ecs/${var.family}/security-group-id"
  type  = "String"
  value = var.security_group_id
  tags  = var.tags
}
