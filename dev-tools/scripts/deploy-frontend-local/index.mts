#!/usr/bin/env -S npx tsx
//
// Deploy the frontend directly from this laptop — build the React app and
// sync it to S3 + invalidate CloudFront, without going through GitHub Actions.
// Mirrors .github/workflows/frontend.yml.
//
// Usage: ./scripts/deploy-frontend-local/index.mts
//

import { $ } from "zx";
import * as p from "@clack/prompts";
import * as path from "node:path";
import { c, abortIfCancel, ensureAwsCli, findCloudFrontDistributionId } from "../lib/index.mts";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const REACT_APP_DIR = path.join(REPO_ROOT, "frontend", "react-app");
const S3_BUCKET = "fristajl.pl";

console.log("");
p.intro(c.mauve.bold("Deploy frontend (local)"));

await ensureAwsCli();

const confirmed = abortIfCancel(
  await p.confirm({ message: `Build the React app and sync it to ${c.peach(`s3://${S3_BUCKET}/`)}?` }),
);
if (!confirmed) {
  p.cancel("Cancelled.");
  process.exit(0);
}

p.log.step("Installing dependencies (npm ci)...");
await $({ stdio: "inherit", cwd: REACT_APP_DIR })`npm ci`;

p.log.step("Linting...");
await $({ stdio: "inherit", cwd: REACT_APP_DIR })`npm run lint`;

p.log.step("Running tests...");
await $({ stdio: "inherit", cwd: REACT_APP_DIR })`npm test`;

p.log.step("Building...");
await $({
  stdio: "inherit",
  cwd: REACT_APP_DIR,
  env: {
    ...process.env,
    VITE_ARENA_URL: process.env.VITE_ARENA_URL || "https://arena.fristajl.pl",
  },
})`npm run build`;

p.log.step(`Syncing dist/ to s3://${S3_BUCKET}/...`);
await $({ stdio: "inherit", cwd: REACT_APP_DIR })`aws s3 sync dist/ s3://${S3_BUCKET}/ --delete --sse AES256`;

const distributionId = await findCloudFrontDistributionId(S3_BUCKET);
if (distributionId) {
  p.log.step(`Invalidating CloudFront distribution ${distributionId}...`);
  await $({ stdio: "inherit" })`aws cloudfront create-invalidation --distribution-id ${distributionId} --paths "/*"`;
} else {
  p.log.warn("Couldn't find a CloudFront distribution with alias fristajl.pl — skipping invalidation.");
}

p.outro(c.green("Done ✔"));
