variable "function_name" {
  type        = string
  description = "Name of the Lambda function"
}

variable "role_name" {
  type        = string
  description = "Name of the IAM role assumed by the Lambda function"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs the Lambda's ENIs are attached to. Must be able to route to the shared RDS instance"
}

variable "security_group_ids" {
  type        = list(string)
  description = "Security group IDs attached to the Lambda function"
}

variable "rds_instance_identifier" {
  type        = string
  description = "Identifier of the shared RDS instance the Lambda resolves its connection details from"
}

variable "rds_instance_arn" {
  type        = string
  description = "ARN of the shared RDS instance, used to scope the Lambda's rds:DescribeDBInstances permission"
}

variable "admin_password_parameter_name" {
  type        = string
  description = "Name of the SSM parameter holding the shared RDS admin (master) user password"
}

variable "admin_password_parameter_arn" {
  type        = string
  description = "ARN of the SSM parameter holding the shared RDS admin (master) user password"
}

variable "database_name" {
  type        = string
  description = "Name of the fristajl database to create on the shared RDS instance if it doesn't already exist"
  default     = "fristajl"
}

variable "application_role_name" {
  type        = string
  description = "IAM-authenticated database role name used by the running backend service"
  default     = "application_user_fristajl"
}

variable "migration_role_name" {
  type        = string
  description = "IAM-authenticated database role name used by the migration/seed ECS tasks"
  default     = "migration_user_fristajl"
}

variable "timeout" {
  type        = number
  description = "Lambda function timeout in seconds"
  default     = 30
}

variable "memory_size" {
  type        = number
  description = "Lambda function memory size in MB"
  default     = 128
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to the Lambda function and its IAM role"
  default     = {}
}
