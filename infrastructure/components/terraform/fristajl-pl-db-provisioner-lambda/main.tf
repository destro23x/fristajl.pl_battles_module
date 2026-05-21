locals {
  lambda_source_dir = "${path.module}/../../../lambda/db-user-provisioner"
}

# Installs production dependencies (pg, pg-format) before the function code is
# zipped. Runs on every apply: node_modules/ is gitignored, so CI always starts
# from a fresh checkout without it, and a package.json-hash trigger alone would
# wrongly skip the install once the resource already exists in state.
resource "null_resource" "npm_install" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command     = "npm install --omit=dev"
    working_dir = local.lambda_source_dir
  }
}

data "archive_file" "lambda_package" {
  type        = "zip"
  source_dir  = local.lambda_source_dir
  output_path = "${path.module}/build/db-user-provisioner.zip"
  excludes    = ["package-lock.json"]

  depends_on = [null_resource.npm_install]
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
  tags               = var.tags
}

# Required so the Lambda can create/attach/delete the ENI used to reach the
# shared events-app RDS instance.
resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lets the Lambda resolve the RDS endpoint and read the admin password
# itself, instead of receiving it in the invoke payload. application_user_fristajl
# and migration_user_fristajl have no passwords (they authenticate via IAM -
# see index.mjs), so only the shared instance's admin password is needed here.
data "aws_kms_alias" "ssm" {
  name = "alias/aws/ssm"
}

data "aws_iam_policy_document" "self_service" {
  statement {
    sid       = "DescribeRdsInstance"
    actions   = ["rds:DescribeDBInstances"]
    resources = [var.rds_instance_arn]
  }

  statement {
    sid       = "ReadDbPasswords"
    actions   = ["ssm:GetParameter"]
    resources = [var.admin_password_parameter_arn]
  }

  statement {
    sid       = "DecryptDbPasswords"
    actions   = ["kms:Decrypt"]
    resources = [data.aws_kms_alias.ssm.target_key_arn]
  }
}

resource "aws_iam_role_policy" "self_service" {
  name   = "${var.role_name}-self-service"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.self_service.json
}

resource "aws_lambda_function" "this" {
  function_name    = var.function_name
  description      = "Creates the fristajl database and IAM-authenticated roles on the shared events-app RDS instance"
  role             = aws_iam_role.this.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = var.timeout
  memory_size      = var.memory_size
  filename         = data.archive_file.lambda_package.output_path
  source_code_hash = data.archive_file.lambda_package.output_base64sha256

  environment {
    variables = {
      RDS_INSTANCE_IDENTIFIER       = var.rds_instance_identifier
      ADMIN_PASSWORD_PARAMETER_NAME = var.admin_password_parameter_name
      DATABASE_NAME                 = var.database_name
      APPLICATION_ROLE_NAME         = var.application_role_name
      MIGRATION_ROLE_NAME           = var.migration_role_name
    }
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_group_ids
  }

  tags = var.tags
}
