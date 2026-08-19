terraform {
  backend "s3" {
    bucket  = "my-terraformstate-18-8"
    key     = "buckets/my-terraformstate-18-8"
    region  = "us-east-1"
    encrypt = true
  }
}