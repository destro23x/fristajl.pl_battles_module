# This project's own slice of routing on the single shared ALB (owned by
# terraform-shared-infrastructure). Keeps all cross-repo dependencies
# one-directional: this component reads the shared ALB's listener ARN via
# remote-state and only ADDS to it (a target group + an SNI certificate +
# a host-based listener rule) - it never modifies the shared listener's
# default action or any other project's rule.
resource "aws_lb_target_group" "this" {
  name        = var.target_group_name
  port        = var.target_group_port
  protocol    = var.target_group_protocol
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = var.target_group_health_check.enabled
    path                = var.target_group_health_check.path
    port                = var.target_group_health_check.port
    protocol            = var.target_group_health_check.protocol
    healthy_threshold   = var.target_group_health_check.healthy_threshold
    unhealthy_threshold = var.target_group_health_check.unhealthy_threshold
    timeout             = var.target_group_health_check.timeout
    interval            = var.target_group_health_check.interval
    matcher             = var.target_group_health_check.matcher
  }
}

# Attach this project's own certificate to the shared HTTPS listener via SNI.
resource "aws_lb_listener_certificate" "this" {
  listener_arn    = var.alb_https_listener_arn
  certificate_arn = var.certificate_arn
}

resource "aws_lb_listener_rule" "this" {
  listener_arn = var.alb_https_listener_arn
  priority     = var.listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  condition {
    host_header {
      values = var.host_headers
    }
  }
}
