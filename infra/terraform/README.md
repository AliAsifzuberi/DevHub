# Terraform notes for DevHub

See the full walkthrough in [`docs/phase-5-cloud.md`](../../docs/phase-5-cloud.md).

## Quick start

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID

cp terraform.tfvars.example terraform.tfvars
# edit project_id

# First apply can create Artifact Registry even before images exist —
# but Cloud Run needs real image digests. Practical order:
# 1. Apply networking + AR + SQL + Redis + secrets (or full apply once images exist)
# 2. Build/push images
# 3. Apply / update Cloud Run

terraform init
terraform plan
terraform apply
```

Cloud SQL private IP + Memorystore + VPC connector incur ongoing cost even at
idle. Destroy when you are done experimenting:

```bash
terraform destroy
```
