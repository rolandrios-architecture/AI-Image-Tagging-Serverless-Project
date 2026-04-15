variable "aws_region" {
  default = "us-east-1"
}

variable "aws_s3_bucket_name" {
description = "Unique name of the S3 bucket for the AI image tagging application"
  type        = string
  default     = "ai-image-tagging-qa-frontend"
}