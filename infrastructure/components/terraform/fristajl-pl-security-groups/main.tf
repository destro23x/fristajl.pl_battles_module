locals {
  # v6 of the module dropped preset rule names (e.g. "http-80-tcp") on the
  # root module - presets now only exist in per-service submodules. This
  # replicates just the handful of preset names this component's stack
  # config uses, so the `sg_*_ingress_rules`/`sg_*_egress_rules` variables
  # can keep taking plain preset-name strings.
  preset_ports = {
    "http-80-tcp"   = 80
    "https-443-tcp" = 443
  }
}

module "web_app_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "6.0.0"

  name        = var.sg_web_app_name
  description = var.sg_web_app_description
  vpc_id      = var.vpc_id

  ingress_rules = {
    from_alb = {
      ip_protocol                  = var.sg_web_app_protocol
      from_port                    = var.sg_web_app_port
      to_port                      = var.sg_web_app_port
      referenced_security_group_id = var.alb_security_group_id
      description                  = "Web app ports from the shared ALB"
    }
  }

  egress_rules = merge(
    {
      to_postgresql = {
        ip_protocol                  = var.sg_postgresql_protocol
        from_port                    = var.postgresql_port
        to_port                      = var.postgresql_port
        referenced_security_group_id = var.postgresql_security_group_id
        description                  = "Web app to shared PostgreSQL (events-app RDS)"
      }
    },
    {
      for rule_name in var.sg_web_app_egress_rules :
      rule_name => {
        ip_protocol = "tcp"
        from_port   = local.preset_ports[rule_name]
        to_port     = local.preset_ports[rule_name]
        cidr_ipv4   = "0.0.0.0/0"
        description = "Web app egress: ${rule_name}"
      }
    }
  )
}

module "lambda_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "6.0.0"

  name        = var.sg_lambda_name
  description = var.sg_lambda_description
  vpc_id      = var.vpc_id

  egress_rules = {
    to_postgresql = {
      ip_protocol                  = var.sg_postgresql_protocol
      from_port                    = var.postgresql_port
      to_port                      = var.postgresql_port
      referenced_security_group_id = var.postgresql_security_group_id
      description                  = "Db provisioner Lambda to shared PostgreSQL"
    }
  }
}

module "migrator_sg" {
  source  = "terraform-aws-modules/security-group/aws"
  version = "6.0.0"

  name        = var.sg_migrator_name
  description = var.sg_migrator_description
  vpc_id      = var.vpc_id

  # Needed to pull the container image from ECR and ship logs to CloudWatch,
  # same as the web app SG (the task runs in a public subnet with a public
  # IP, mirroring the ECS backend service).
  egress_rules = {
    https = {
      ip_protocol = "tcp"
      from_port   = 443
      to_port     = 443
      cidr_ipv4   = "0.0.0.0/0"
      description = "ECR/CloudWatch access"
    }
    to_postgresql = {
      ip_protocol                  = var.sg_postgresql_protocol
      from_port                    = var.postgresql_port
      to_port                      = var.postgresql_port
      referenced_security_group_id = var.postgresql_security_group_id
      description                  = "Db migrator/seed ECS task to shared PostgreSQL"
    }
  }
}

# Grant the new fristajl security groups ingress into the shared
# PostgreSQL security group owned by events-app's Terraform state. These are
# independent resources managed from THIS state - they add rules alongside
# events-app's own, without modifying or conflicting with them.
resource "aws_vpc_security_group_ingress_rule" "postgresql_from_web_app" {
  security_group_id            = var.postgresql_security_group_id
  referenced_security_group_id = module.web_app_sg.id
  ip_protocol                  = var.sg_postgresql_protocol
  from_port                    = var.postgresql_port
  to_port                      = var.postgresql_port
  description                  = "Allow fristajl web app to access shared PostgreSQL"
}

resource "aws_vpc_security_group_ingress_rule" "postgresql_from_lambda" {
  security_group_id            = var.postgresql_security_group_id
  referenced_security_group_id = module.lambda_sg.id
  ip_protocol                  = var.sg_postgresql_protocol
  from_port                    = var.postgresql_port
  to_port                      = var.postgresql_port
  description                  = "Allow fristajl db provisioner Lambda to access shared PostgreSQL"
}

resource "aws_vpc_security_group_ingress_rule" "postgresql_from_migrator" {
  security_group_id            = var.postgresql_security_group_id
  referenced_security_group_id = module.migrator_sg.id
  ip_protocol                  = var.sg_postgresql_protocol
  from_port                    = var.postgresql_port
  to_port                      = var.postgresql_port
  description                  = "Allow fristajl db migrator/seed ECS tasks to access shared PostgreSQL"
}
