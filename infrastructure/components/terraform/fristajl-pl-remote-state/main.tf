# Read-only lookups into events-app's Terraform state (separate repo, same
# AWS account). See stacks/catalog/core.yaml for important notes on
# the workspace_key_prefix values used below - they must match how
# events-app's own Atmos components name themselves in its S3 backend.

# Read-only lookups into terraform-shared-infrastructure's Terraform state
# (separate repo, same AWS account). workspace_key_prefix must match the
# shared-infra-* component directory name, and workspace must match the
# Atmos-generated "<stack>-<catalog-component-key>" workspace name (verify
# against that repo's .terraform/environment files if these drift again).

locals {
  remote_backend_defaults = {
    bucket = var.shared_tfstate_bucket
    key    = "terraform.tfstate"
    region = var.shared_tfstate_region
  }
}

data "terraform_remote_state" "vpc" {
  backend   = "s3"
  workspace = var.shared_workspace
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "vpc"
  })
}

data "terraform_remote_state" "security_groups" {
  backend   = "s3"
  workspace = "${var.shared_workspace}-security-groups"
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "shared-infra-security-groups"
  })
}

data "terraform_remote_state" "rds" {
  backend   = "s3"
  workspace = "${var.shared_workspace}-rds"
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "shared-infra-rds"
  })
}

data "terraform_remote_state" "rds_admin_password" {
  backend   = "s3"
  workspace = "${var.shared_workspace}-rds-admin-user-password"
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "shared-infra-ssm-random-password"
  })
}

# The shared repo owns the account's single GitHub OIDC provider (only one
# can exist per AWS account) - both events-app and fristajl reuse its CI/CD
# role rather than vendoring their own.
data "terraform_remote_state" "github_oidc" {
  backend   = "s3"
  workspace = var.shared_workspace
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "terraform-aws-github-oidc-provider"
  })
}

data "terraform_remote_state" "aws_alb" {
  backend   = "s3"
  workspace = var.shared_workspace
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "aws-alb"
  })
}

data "terraform_remote_state" "access_logs" {
  backend   = "s3"
  workspace = "${var.shared_workspace}-access-logs"
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "aws-s3-bucket"
  })
}

data "terraform_remote_state" "ecs_cluster" {
  backend = "s3"
  # catalog key "ecs-cluster" differs from metadata.component "aws-ecs-cluster".
  workspace = "${var.shared_workspace}-ecs-cluster"
  config = merge(local.remote_backend_defaults, {
    workspace_key_prefix = "aws-ecs-cluster"
  })
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

