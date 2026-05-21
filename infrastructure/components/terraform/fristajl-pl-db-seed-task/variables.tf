variable "family" {
  type        = string
  description = "Task definition family name"
}

variable "execution_role_name" {
  type        = string
  description = "Name of the ECS task execution IAM role"
}

variable "cpu" {
  type        = number
  description = "Fargate task CPU units"
  default     = 256
}

variable "memory" {
  type        = number
  description = "Fargate task memory (MB)"
  default     = 512
}

variable "image" {
  type        = string
  description = "Placeholder container image. Overwritten by the calling workflow before every run"
}

variable "region" {
  type        = string
  description = "AWS region, used for the awslogs log driver configuration"
}

variable "db_host" {
  type        = string
  description = "RDS endpoint address"
}

variable "db_port" {
  type        = string
  description = "RDS port"
}

variable "db_name" {
  type        = string
  description = "Database name"
}

variable "db_user" {
  type        = string
  description = "IAM-authenticated database role name used to connect (e.g. application_user_fristajl)"
}

variable "rds_db_connect_arn" {
  type        = string
  description = "rds-db:connect resource ARN for the database role in db_user (arn:aws:rds-db:<region>:<account>:dbuser:<resource-id>/<db_user>)"
}

variable "admin_password_parameter_arn" {
  type        = string
  description = "ARN of the SSM parameter holding the seeded portal admin user's password"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs the seed task runs in (published to SSM for the workflow to read)"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID attached to the seed task (published to SSM for the workflow to read)"
}

variable "log_retention_in_days" {
  type        = number
  description = "CloudWatch log group retention in days"
  default     = 14
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to created resources"
  default     = {}
}
