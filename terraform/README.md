# Deploy Plateful to EC2

1. Push this application to a public Git repository.
2. Copy `terraform.tfvars.example` to `terraform.tfvars` and replace `app_repository` with that repository URL.
3. Configure AWS credentials locally, then run:

   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

Terraform outputs `ec2_instance_id` and `application_url`. Open the application URL after the EC2 user-data script finishes (usually a few minutes).

The app is served on port `8094`. PostgreSQL remains inside Docker on the instance and is not public.
