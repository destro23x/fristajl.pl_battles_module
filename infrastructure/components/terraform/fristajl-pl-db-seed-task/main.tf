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

# Lets the ECS agent (using the execution role) resolve the seeded portal
# admin password from SSM to inject it as a container secret.
# application_user_fristajl itself has no password - it authenticates via
# IAM (see lambda/db-user-provisioner) using the task role below.
# fristajl only has a single admin dashboard user, unlike events-app's
# separate admin/moderator roles.
data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

data "aws_iam_policy_document" "read_db_password" {
  statement {
    sid = "ReadSeedPassword"
    # ECS task execution uses the batch GetParameters API (not the singular
    # GetParameter) to resolve container "secrets" - both actions must be
    # granted or the task fails at launch with ResourceInitializationError.
    actions = ["ssm:GetParameter", "ssm:GetParameters"]
    resources = [
      var.admin_password_parameter_arn,
    ]
  }

  statement {
    sid       = "DecryptSeedPassword"
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_alias.ssm.target_key_arn]
  }
}

resource "aws_iam_role_policy" "read_db_password" {
  name   = "${var.execution_role_name}-read-db-password"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.read_db_password.json
}

# The task role (distinct from the execution role) is assumed by the
# container process itself and is what the seed.sh script's IAM auth token
# is signed with. Scoped to rds-db:connect as application_user_fristajl only.
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
    sid       = "ConnectAsApplicationUser"
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

# The seed workflow passes the image tag to seed with as a Terraform `-var`
# on every `atmos terraform apply`, so Terraform stays the sole owner of
# container_definitions - no ignore_changes here (a prior `ignore_changes =
# [container_definitions]` froze this block after the first apply, so the
# ADMIN_PASSWORD secret's valueFrom kept pointing at the pre-rename
# "fristajl-portal-admin-password" SSM parameter ARN even after storage.yaml
# was renamed to path-style "/fristajl/portal-admin-password", causing
# ResourceInitializationError/AccessDeniedException on ssm:GetParameters).
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
      name      = "seeder"
      image     = var.image
      essential = true
      command   = ["./seed.sh"]

      environment = [
        { name = "RDS_HOST", value = var.db_host },
        { name = "RDS_PORT", value = tostring(var.db_port) },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USER", value = var.db_user },
        { name = "DB_SSL", value = "true" },
        { name = "DB_IAM_AUTH", value = "true" },
        { name = "AWS_REGION", value = var.region },
        { name = "ADMIN_USERNAME", value = "admin" }
      ]

      secrets = [
        { name = "ADMIN_PASSWORD", valueFrom = var.admin_password_parameter_arn }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.this.name
          awslogs-region        = var.region
          awslogs-stream-prefix = "seed"
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
