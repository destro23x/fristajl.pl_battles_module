variable "name" {
  description = "Name of the SSM parameter. If it contains a path (forward slashes), it must start with a leading `/`"
  type        = string
}

variable "description" {
  description = "Description of the parameter"
  type        = string
  default     = null
}

variable "region" {
  description = "Region where the resource(s) will be managed. Defaults to the Region set in the provider configuration"
  type        = string
  default     = null
}

variable "key_id" {
  description = "KMS key ID or ARN used to encrypt the SecureString value. Defaults to the AWS managed `alias/aws/ssm` key"
  type        = string
  default     = null
}

variable "tier" {
  description = "Parameter tier: Standard, Advanced, or Intelligent-Tiering"
  type        = string
  default     = null
}

variable "overwrite" {
  description = "Whether to overwrite an existing parameter with the same name"
  type        = bool
  default     = true
}

variable "tags" {
  description = "A map of tags to add to the parameter"
  type        = map(string)
  default     = {}
}

variable "value" {
  description = "Placeholder value for the secret. Terraform will never overwrite it again after initial creation - set the real value manually after apply"
  type        = string
  sensitive   = true
}
