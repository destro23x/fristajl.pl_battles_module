resource "random_password" "this" {
  length      = var.length
  special     = var.special
  min_upper   = var.min_upper
  min_lower   = var.min_lower
  min_numeric = var.min_numeric
  min_special = var.min_special

  override_special = var.override_special

  # Keep the generated value stable across plans/applies unless explicitly
  # rotated (e.g. by bumping `keepers`).
  keepers = var.keepers
}

resource "aws_ssm_parameter" "this" {
  region = var.region

  name        = var.name
  description = var.description
  type        = "SecureString"
  key_id      = var.key_id
  tier        = var.tier
  overwrite   = var.overwrite

  value = random_password.this.result

  tags = var.tags

  lifecycle {
    ignore_changes = [
      # Never let a subsequent `apply` regenerate/overwrite the password once
      # it has been created, so downstream consumers of this parameter keep
      # working with the same credential.
      value,
    ]
  }
}
