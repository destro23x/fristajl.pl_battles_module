variable "shared_tfstate_bucket" {
  type        = string
  description = "S3 bucket holding the terraform-shared-infrastructure project's Terraform state"
  default     = "shared-infra-pl-prod-tfstate"
}

variable "shared_tfstate_region" {
  type        = string
  description = "Region of the terraform-shared-infrastructure tfstate S3 bucket"
  default     = "eu-central-1"
}

variable "shared_workspace" {
  type        = string
  description = "Terraform workspace used by terraform-shared-infrastructure's Atmos components (the atmos stack name, e.g. \"prod\")"
  default     = "prod"
}

variable "shared_rds_instance_identifier" {
  type        = string
  description = "Identifier of the shared RDS instance"
  default     = "shared-infra-db"
}
