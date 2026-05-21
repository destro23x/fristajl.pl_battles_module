variable "vpc_id" {
  type        = string
  description = "VPC ID (shared VPC from terraform-shared-infrastructure) where the security groups are created"
}

variable "alb_security_group_id" {
  type        = string
  description = "ID of the shared ALB security group (from terraform-shared-infrastructure)"
}

variable "postgresql_security_group_id" {
  type        = string
  description = "ID of the shared PostgreSQL security group (from terraform-shared-infrastructure)"
}

variable "postgresql_port" {
  type        = number
  description = "Port for the shared PostgreSQL instance"
  default     = 7059
}

variable "sg_postgresql_protocol" {
  type        = string
  description = "Protocol for PostgreSQL traffic"
  default     = "tcp"
}

variable "sg_web_app_name" {
  type        = string
  description = "Name of the web app security group"
}

variable "sg_web_app_description" {
  type        = string
  description = "Description of the web app security group"
}

variable "sg_web_app_port" {
  type        = number
  description = "Port exposed by the web app"
  default     = 8080
}

variable "sg_web_app_protocol" {
  type        = string
  description = "Protocol for web app traffic"
  default     = "tcp"
}

variable "sg_web_app_egress_rules" {
  type        = list(string)
  description = "Egress rules for the web app security group"
  default     = []
}

variable "sg_lambda_name" {
  type        = string
  description = "Name of the db provisioner Lambda security group"
}

variable "sg_lambda_description" {
  type        = string
  description = "Description of the db provisioner Lambda security group"
}

variable "sg_migrator_name" {
  type        = string
  description = "Name of the db migrator/seed ECS task security group"
}

variable "sg_migrator_description" {
  type        = string
  description = "Description of the db migrator/seed ECS task security group"
}
