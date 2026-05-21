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

variable "length" {
  description = "Length of the generated password"
  type        = number
  default     = 32
}

variable "special" {
  description = "Whether to include special characters in the generated password"
  type        = bool
  default     = true
}

variable "override_special" {
  description = "Supply your own list of special characters to use for string generation"
  type        = string
  default     = "!#$%&*()-_=+[]{}<>:?"
}

variable "min_upper" {
  description = "Minimum number of uppercase letters in the generated password"
  type        = number
  default     = 1
}

variable "min_lower" {
  description = "Minimum number of lowercase letters in the generated password"
  type        = number
  default     = 1
}

variable "min_numeric" {
  description = "Minimum number of numeric digits in the generated password"
  type        = number
  default     = 1
}

variable "min_special" {
  description = "Minimum number of special characters in the generated password"
  type        = number
  default     = 1
}

variable "keepers" {
  description = "Arbitrary map of values that, when changed, trigger regeneration of the password"
  type        = map(string)
  default     = {}
}
