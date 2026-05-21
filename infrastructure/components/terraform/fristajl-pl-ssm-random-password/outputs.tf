output "parameter_name" {
  description = "Name of the created SSM parameter"
  value       = aws_ssm_parameter.this.name
}

output "parameter_arn" {
  description = "ARN of the created SSM parameter"
  value       = aws_ssm_parameter.this.arn
}

output "value" {
  description = "The randomly generated password value"
  value       = random_password.this.result
  sensitive   = true
}
