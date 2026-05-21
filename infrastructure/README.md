# Atmos commands for Events app🎵

## Devcontainer commands (never used):

```bash
atmos devcontainer list
atmos devcontainer attach geodesic
atmos devcontainer exec geodesic -- <cmd>
atmos devcontainer start geodesic
atmos devcontainer attach geodesic
```

## Atmos pull external components

```bash
atmos vendor pull 
atmos vendor pull --component account-map
```

## Atmos debug commands

```bash
atmos describe component tfstate-backend -s prod
atmos describe component tfstate-backend -s prod 2>&1 | grep -E "(namespace|tenant|stage|name|delimiter|label_order)" -A 2
atmos describe component tfstate-backend -s prod 2>&1 | grep -A 5 "^vars:"
atmos describe component tfstate-backend -s prod 2>&1 | grep -A 50 "^vars:" | head -60          
atmos describe component tfstate-backend -s prod 2>&1 | sed -n '/^vars:/,/^[a-z_]*:/p' | head -30
atmos describe component tfstate-backend -s prod 2>&1 | sed -n '/^vars:/,/^workspace:/p'
atmos describe component tfstate-backend -s prod 2>&1 | grep -E "namespace|delimiter|label_order" | head -10
atmos describe component tfstate-backend -s prod 2>&1 | sed -n '/^vars:/,/^workspace:/p' | grep -E "namespace|delimiter|label_order" -A 3
```

# Export credentials

```bash
export AWS_REGION=eu-central-1
export AWS_ACCESS_KEY_ID=xxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxx

# Terraform

## Atmos import resource
```bash
atmos terraform import tfstate-backend 'module.tfstate_backend.aws_s3_bucket.default[0]' 'events-app-pl-prod-tfstate' -s prod
```

## Atmos Terraform plan:

```bash
atmos vendor pull

# When applying terraform for the first time backend_type needs to be changed to local in infrastructure/stacks/_defaults.yaml
# Once tfstate S3 bucket created, change backend_type to s3 and rerun below commands to move tfstate file to S3 bucket location.

atmos terraform plan tfstate-backend --stack prod
atmos terraform plan tfstate-backend -var=access_roles_enabled=false --stack prod
```

## Atmos Terraform apply

```bash
atmos terraform apply tfstate-backend --stack prod
```

# Workflow

## Atmos Workflow plan
```bash
atmos workflow plan-all-core -f core.yaml
```

## Atmos Workflow apply
```bash
atmos workflow apply-all-core -f core.yaml
```

## Atmos Workflow destroy
```bash
atmos workflow destroy-all-core -f core.yaml
```


### Core workflow 

Should be applied directly from the local laptop.
Any other components could be applied either local or from github actions. 

# Provisioning infrastructure


1. Create core resources

```bash
export AWS_REGION=eu-central-1
export AWS_ACCESS_KEY_ID=xxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxx
atmos.yaml change line number 28 auto_generate_backend_file: false # Set to false while running it for the first time
atmos workflow plan-all-core -f core.yaml
atmos workflow apply-all-core -f core.yaml

atmos.yaml change line number 28 auto_generate_backend_file: true # Set to false while running

Run again to migrate local tfstate to S3 bucket:
atmos workflow apply-all-core -f core.yaml

atmos workflow plan-all-networking -f networking.yaml
atmos workflow apply-all-networking -f networking.yaml

atmos workflow plan-all-security -f security.yaml
atmos workflow apply-all-security -f security.yaml

atmos workflow plan-all-storage -f storage.yaml
atmos workflow apply-all-storage -f storage.yaml

atmos workflow plan-all-alb -f app.yaml
atmos workflow apply-all-alb -f app.yaml

atmos workflow plan-all-ecs -f app.yaml
atmos workflow apply-all-ecs -f app.yaml


Set GitHub secrets for prod environment:

AWS_ACCOUNT_ID: xxx
AWS_REGION: xxx
OIDC_AWS_ROLE_TERRAFORM: xxx

```

Run infrastructure pipelines to provision rest resources



In the pipeline 
```
atmos workflow plan-ecs-only -f app.yaml
atmos workflow apply-ecs-only -f app.yaml
```


Old DNS Nameservers:

ns-542.awsdns-03.net
ns-1108.awsdns-10.org
ns-231.awsdns-28.com
ns-1836.awsdns-37.co.uk

New DNS Nameservers:

ns-423.awsdns-52.com.
ns-727.awsdns-26.net.
ns-1081.awsdns-07.org.
ns-1676.awsdns-17.co.uk.



{
	      "Sid": "AllowCrossAccountList",
	      "Effect": "Allow",
	      "Principal": {
	        "AWS": "arn:aws:iam::721366090532:root"
	      },
	      "Action": "s3:ListBucket",
	      "Resource": "arn:aws:s3:::fristajl-prod-topics"
	    },
	    {
	      "Sid": "AllowCrossAccountWrite",
	      "Effect": "Allow",
	      "Principal": {
	        "AWS": "arn:aws:iam::721366090532:root"
	      },
	      "Action": [
	        "s3:PutObject",
	        "s3:PutObjectTagging"
	      ],
	      "Resource": "arn:aws:s3:::fristajl-prod-topics/*"
	    }