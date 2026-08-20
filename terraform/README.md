# Run the app on EC2

1. Put the application in a public Git repository.
2. Copy `terraform.tfvars.example` to `terraform.tfvars` and set `app_repository`.
3. Configure AWS credentials and run:

   ```bash
   terraform init
   terraform apply
   ```

Open the printed `application_url` after the instance finishes booting. The app is available on port `8094`.
