data "aws_s3_bucket" "this" {
  bucket = var.bucket_id
}

data "aws_s3_bucket_policy" "existing" {
  bucket = data.aws_s3_bucket.this.id
}

data "aws_iam_policy_document" "merged" {
  # Preserve all existing statements (deny insecure transport, encryption headers, etc.)
  source_policy_documents = [data.aws_s3_bucket_policy.existing.policy]

  statement {
    sid    = "AllowCloudFrontServicePrincipalReadOnly"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${data.aws_s3_bucket.this.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [var.cloudfront_distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "oac" {
  bucket = data.aws_s3_bucket.this.id
  policy = data.aws_iam_policy_document.merged.json
}
