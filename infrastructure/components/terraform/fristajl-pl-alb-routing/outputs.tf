output "target_group_arn" {
  description = "ARN of this project's target group"
  value       = aws_lb_target_group.this.arn
}

output "target_group_name" {
  description = "Name of this project's target group"
  value       = aws_lb_target_group.this.name
}
