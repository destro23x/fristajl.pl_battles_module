output "vpc_id" {
  description = "Shared VPC ID (terraform-shared-infrastructure)"
  value       = data.terraform_remote_state.vpc.outputs.vpc_id
}

output "public_subnets" {
  description = "Shared public subnet IDs (terraform-shared-infrastructure)"
  value       = data.terraform_remote_state.vpc.outputs.public_subnets
}

output "private_subnets" {
  description = "Shared private subnet IDs (terraform-shared-infrastructure)"
  value       = data.terraform_remote_state.vpc.outputs.private_subnets
}

output "alb_security_group_id" {
  description = "Security group ID of the shared ALB"
  value       = data.terraform_remote_state.security_groups.outputs.alb_security_group_id
}

output "postgresql_security_group_id" {
  description = "Security group ID of the shared RDS instance"
  value       = data.terraform_remote_state.security_groups.outputs.postgresql_security_group_id
}

output "rds_instance_identifier" {
  description = "Identifier of the shared RDS instance"
  value       = var.shared_rds_instance_identifier
}

output "db_instance_address" {
  description = "Shared RDS instance endpoint address"
  value       = data.terraform_remote_state.rds.outputs.db_instance_address
}

output "db_instance_port" {
  description = "Shared RDS instance port"
  value       = data.terraform_remote_state.rds.outputs.db_instance_port
}

output "db_instance_arn" {
  description = "ARN of the shared RDS instance"
  value       = data.terraform_remote_state.rds.outputs.db_instance_arn
}

output "db_instance_resource_id" {
  description = "AWS Region-unique, immutable resource ID of the shared RDS instance"
  value       = data.terraform_remote_state.rds.outputs.db_instance_resource_id
}

output "admin_password_parameter_name" {
  description = "Name of the SSM parameter holding the shared RDS admin (master) user password"
  value       = data.terraform_remote_state.rds_admin_password.outputs.parameter_name
}

output "admin_password_parameter_arn" {
  description = "ARN of the SSM parameter holding the shared RDS admin (master) user password"
  value       = data.terraform_remote_state.rds_admin_password.outputs.parameter_arn
}

output "oidc_role_arn" {
  description = "ARN of the shared GitHub Actions OIDC CI/CD role"
  value       = data.terraform_remote_state.github_oidc.outputs.oidc_role
}

output "alb_https_listener_arn" {
  description = "ARN of the shared ALB's HTTPS listener"
  value       = data.terraform_remote_state.aws_alb.outputs.listeners["ex-https"].arn
}

output "alb_dns_name" {
  description = "DNS name of the shared ALB"
  value       = data.terraform_remote_state.aws_alb.outputs.dns_name
}

output "alb_zone_id" {
  description = "Route53 hosted zone ID of the shared ALB"
  value       = data.terraform_remote_state.aws_alb.outputs.zone_id
}

output "access_logs_bucket_id" {
  description = "S3 bucket ID of the shared ALB/WAF access-logs bucket"
  value       = data.terraform_remote_state.access_logs.outputs.s3_bucket_id
}

output "ecs_cluster_arn" {
  description = "ARN of the ONE shared ECS cluster - this project's own ecs-service component creates its service(s) into it"
  value       = data.terraform_remote_state.ecs_cluster.outputs.arn
}

output "ecs_cluster_name" {
  description = "Name of the ONE shared ECS cluster"
  value       = data.terraform_remote_state.ecs_cluster.outputs.name
}

# Precomputed rds-db:connect resource ARNs for fristajl's own
# IAM-authenticated DB roles (distinct role names from events-app's own
# application_user_events_app/migration_user_events_app, since roles are
# global to the RDS instance, not scoped per-database).
output "rds_db_connect_arn_application_user_fristajl" {
  description = "rds-db:connect resource ARN for application_user_fristajl"
  value       = "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${data.terraform_remote_state.rds.outputs.db_instance_resource_id}/application_user_fristajl"
}

output "rds_db_connect_arn_migration_user_fristajl" {
  description = "rds-db:connect resource ARN for migration_user_fristajl"
  value       = "arn:aws:rds-db:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:dbuser:${data.terraform_remote_state.rds.outputs.db_instance_resource_id}/migration_user_fristajl"
}
