terraform {
  required_version = ">= 1.11.1"

  # terraform-aws-modules/security-group/aws v6.0.0 requires the AWS
  # provider's v6 resources (aws_vpc_security_group_ingress_rule /
  # aws_vpc_security_group_egress_rule).
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.29"
    }
  }
}
