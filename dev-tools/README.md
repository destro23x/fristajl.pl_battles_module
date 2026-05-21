# fristajl-dev-tools

Interactive scripts to deploy fristajl.pl (backend/frontend/content/infrastructure) without pushing to `main`.

## Prerequisites

**Node.js** and the dependencies in `package.json` are required for all scripts:

```bash
pnpm install
```

Some scripts also require external CLI tools:

```bash
brew install gh        # required by deploy-backend.mts, deploy-frontend.mts, deploy-content.mts, deploy-infrastructure.mts
gh auth login

brew install awscli     # required by every *-local.mts script
aws sso login            # or configure credentials another way

# Docker Desktop must be running — required by deploy-backend-local.mts
```

`atmos` and `terraform` are also required by the infrastructure scripts (already used elsewhere in this repo — see `infrastructure/README.md`).

## Scripts

### `index.mts`

Interactive launcher — presents a menu of all available scripts with short descriptions and lets you select and run one.

**Usage:**

```bash
./index.mts
```

---

## Deploy (GitHub Actions)

These trigger the existing `workflow_dispatch`-only GitHub Actions workflows (`.github/workflows/*.yml`) and can tail their logs — no push to `main` required.

**Dependencies:** `gh` (`brew install gh`, then `gh auth login`)

### `deploy-backend`

Triggers **Build and Deploy Backend** (`backend.yml`): builds the Kotlin/Maven backend, pushes the Docker image to ECR, and (after manual approval) deploys it to ECS.

**Usage:**

```bash
./scripts/deploy-backend/index.mts [image-tag]
```

### `deploy-frontend`

Triggers **Build and Deploy Frontend** (`frontend.yml`): builds the React app and syncs it to the `fristajl.pl` S3 bucket + invalidates CloudFront.

**Usage:**

```bash
./scripts/deploy-frontend/index.mts
```

### `deploy-content`

Triggers **Deploy Content** (`content.yml`): uploads `content/topics/topics.txt` to the `fristajl-prod-topics` S3 bucket.

**Usage:**

```bash
./scripts/deploy-content/index.mts
```

### `deploy-infrastructure`

Triggers **Infrastructure** (`infrastructure.yml`): plans, then (after a manual approval issue) applies Terraform/Atmos changes to prod. Requires typing `APPLY` to confirm before dispatching, since it affects real AWS resources.

**Usage:**

```bash
./scripts/deploy-infrastructure/index.mts
```

---

## Deploy (local machine)

These build and deploy directly from your laptop, bypassing GitHub Actions entirely. Useful when CI is down or you need a faster iteration loop.

**Dependencies:** `awscli` + authenticated credentials; Docker Desktop running (backend only); `atmos`/`terraform` (backend + infrastructure only)

### `deploy-backend-local`

Runs backend tests, builds the Docker image, pushes it to ECR (tag + `:latest`), then plans/applies the ECS task definition via Atmos with the new image.

**Usage:**

```bash
./scripts/deploy-backend-local/index.mts [image-tag]
```

### `deploy-frontend-local`

Lints, tests, and builds the React app, syncs `dist/` to the `fristajl.pl` S3 bucket, and invalidates CloudFront (distribution is auto-discovered by alias — no secret needed).

**Usage:**

```bash
./scripts/deploy-frontend-local/index.mts
```

### `deploy-content-local`

Uploads `content/topics/topics.txt` straight to the `fristajl-prod-topics` S3 bucket.

**Usage:**

```bash
./scripts/deploy-content-local/index.mts
```

### `deploy-infrastructure-local`

Plans all Atmos stacks (core, networking, security, storage, alb, ecs), then requires typing `APPLY` before applying them in order — same safety gate as `deploy-infrastructure`, minus the manual-approval issue.

**Usage:**

```bash
./scripts/deploy-infrastructure-local/index.mts
```
