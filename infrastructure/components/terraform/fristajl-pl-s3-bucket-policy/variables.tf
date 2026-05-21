variable "bucket_id" {
  description = "The name (ID) of the S3 bucket to attach the policy to."
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "The ARN of the CloudFront distribution that is allowed to access the bucket via OAC."
  type        = string
}
