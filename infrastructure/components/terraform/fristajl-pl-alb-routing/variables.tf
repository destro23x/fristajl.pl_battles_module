variable "vpc_id" {
  type        = string
  description = "VPC ID (from terraform-shared-infrastructure's remote-state) where the target group is created"
}

variable "alb_https_listener_arn" {
  type        = string
  description = "ARN of the shared ALB's HTTPS listener (from terraform-shared-infrastructure's remote-state)"
}

variable "certificate_arn" {
  type        = string
  description = "ARN of this project's own ACM certificate, attached to the shared listener via SNI"
}

variable "listener_rule_priority" {
  type        = number
  description = "Listener rule priority - must be unique across every project sharing the ALB"
}

variable "host_headers" {
  type        = list(string)
  description = "Host header values routed to this project's target group"
}

variable "target_group_name" {
  type        = string
  description = "Name of the target group"
}

variable "target_group_port" {
  type        = number
  description = "Port the target group forwards to"
}

variable "target_group_protocol" {
  type        = string
  description = "Protocol the target group forwards with"
  default     = "HTTP"
}

variable "target_group_health_check" {
  type = object({
    enabled             = optional(bool, true)
    path                = optional(string, "/health")
    port                = optional(string, "traffic-port")
    protocol            = optional(string, "HTTP")
    healthy_threshold   = optional(number, 2)
    unhealthy_threshold = optional(number, 3)
    timeout             = optional(number, 10)
    interval            = optional(number, 30)
    matcher             = optional(string, "200")
  })
  description = "Target group health check configuration"
  default     = {}
}
