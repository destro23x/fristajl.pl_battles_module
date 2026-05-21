output "task_definition_family" {
  description = "Task definition family name"
  value       = aws_ecs_task_definition.this.family
}

output "task_definition_arn" {
  description = "ARN of the task definition registered by Terraform (the workflow registers newer revisions with the correct image at run time)"
  value       = aws_ecs_task_definition.this.arn
}

output "execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.execution.arn
}

output "log_group_name" {
  description = "CloudWatch log group used by the seed task"
  value       = aws_cloudwatch_log_group.this.name
}
