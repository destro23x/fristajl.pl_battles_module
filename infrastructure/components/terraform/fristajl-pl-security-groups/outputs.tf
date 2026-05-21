output "web_app_security_group_id" {
  description = "Web app security group ID"
  value       = module.web_app_sg.id
}

output "lambda_security_group_id" {
  description = "Db provisioner Lambda security group ID"
  value       = module.lambda_sg.id
}

output "migrator_security_group_id" {
  description = "Db migrator/seed ECS task security group ID"
  value       = module.migrator_sg.id
}
