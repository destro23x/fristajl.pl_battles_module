resource "aws_ssm_parameter" "this" {
  region = var.region

  name        = var.name
  description = var.description
  type        = "SecureString"
  key_id      = var.key_id
  tier        = var.tier
  overwrite   = var.overwrite

  value = var.value

  tags = var.tags

  lifecycle {
    ignore_changes = [
      # This is a manually-managed secret (e.g. a third-party API key) -
      # Terraform only creates the parameter with a placeholder value; the
      # real value must be set out-of-band (e.g. `aws ssm put-parameter
      # --overwrite`) and must not be reverted by a subsequent apply.
      value,
    ]
  }
}
