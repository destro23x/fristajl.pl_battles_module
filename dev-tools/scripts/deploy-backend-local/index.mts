#!/usr/bin/env -S npx tsx
//
// Deploy the backend directly from this laptop — build + push the Docker
// image to ECR and apply the ECS task definition via Atmos, without going
// through GitHub Actions. Mirrors .github/workflows/backend.yml.
//
// Usage: ./scripts/deploy-backend-local/index.mts [image-tag]
//

import { $ } from "zx";
import * as p from "@clack/prompts";
import * as path from "node:path";
import {
  c,
  abortIfCancel,
  ensureAwsCli,
  ensureDockerRunning,
  buildAndPushEcrImage,
} from "../lib/index.mts";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const BACKEND_DIR = path.join(REPO_ROOT, "backend");
const INFRA_DIR = path.join(REPO_ROOT, "infrastructure");
const ECR_REPOSITORY = "fristajl-backend";

console.log("");
p.intro(c.mauve.bold("Deploy backend (local)"));

await ensureAwsCli();
await ensureDockerRunning();

let imageTag = process.argv[2];
if (!imageTag) {
  const sha = (await $({ cwd: REPO_ROOT })`git rev-parse --short HEAD`).stdout.trim();
  imageTag = abortIfCancel(
    await p.text({ message: "Image tag:", initialValue: sha }),
  ) as string;
}

const runTests = abortIfCancel(await p.confirm({ message: "Run backend tests first?", initialValue: true }));

const confirmed = abortIfCancel(
  await p.confirm({ message: `Build, push ${c.peach(`${ECR_REPOSITORY}:${imageTag}`)} and deploy it to ECS?` }),
);
if (!confirmed) {
  p.cancel("Cancelled.");
  process.exit(0);
}

if (runTests) {
  p.log.step("Running backend tests (mvn test)...");
  await $({ stdio: "inherit", cwd: BACKEND_DIR })`mvn -B test`;
}

const imageUri = await buildAndPushEcrImage({
  contextDir: BACKEND_DIR,
  dockerfile: path.join(BACKEND_DIR, "Dockerfile"),
  repository: ECR_REPOSITORY,
  tag: imageTag,
});

p.log.step("Pulling Atmos vendor modules...");
await $({ stdio: "inherit", cwd: INFRA_DIR })`atmos vendor pull`;

p.log.step(`Planning ECS component with image ${imageUri}...`);
await $({ stdio: "inherit", cwd: INFRA_DIR, env: { ...process.env, IMAGE_URI: imageUri } })`atmos workflow plan-ecs-only -f app.yaml`;

const apply = abortIfCancel(await p.confirm({ message: "Apply the ECS plan above to prod?" }));
if (!apply) {
  p.cancel("Cancelled — image was pushed to ECR but ECS was not updated.");
  process.exit(0);
}

await $({ stdio: "inherit", cwd: INFRA_DIR, env: { ...process.env, IMAGE_URI: imageUri } })`atmos workflow apply-ecs-only -f app.yaml`;

p.outro(c.green("Done ✔"));
