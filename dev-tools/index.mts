#!/usr/bin/env -S npx tsx
//
// Interactive index of fristajl.pl dev-tools scripts.
// Alternative ways to deploy backend/frontend/content/infrastructure without
// pushing to main — all workflows are workflow_dispatch-only (see .github/workflows).
//
// Usage: ./index.mts
//

import { $ } from "zx";
import * as p from "@clack/prompts";
import * as path from "node:path";
import { c, abortIfCancel } from "./scripts/lib/index.mts";

$.verbose = false;

interface ScriptEntry {
  file: string; // filename only, e.g. 'deploy-backend/index.mts'
  label: string; // short label for menu
  description: string; // one-line description shown in detail card
  usageHint: string; // usage hint shown in detail card
}

interface Category {
  label: string;
  description: string;
  scripts: ScriptEntry[];
}

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname);

const CATEGORIES: Category[] = [
  {
    label: "Deploy (GitHub Actions)",
    description: "Trigger fristajl.pl GitHub Actions deployments on-demand (workflow_dispatch)",
    scripts: [
      {
        file: "deploy-backend/index.mts",
        label: "deploy-backend",
        description: "Build backend Docker image, push to ECR, and deploy to ECS",
        usageHint: "./scripts/deploy-backend/index.mts [image-tag]",
      },
      {
        file: "deploy-frontend/index.mts",
        label: "deploy-frontend",
        description: "Build the React app and sync it to S3 + invalidate CloudFront",
        usageHint: "./scripts/deploy-frontend/index.mts",
      },
      {
        file: "deploy-content/index.mts",
        label: "deploy-content",
        description: "Upload content/topics/topics.txt to the fristajl-prod-topics S3 bucket",
        usageHint: "./scripts/deploy-content/index.mts",
      },
      {
        file: "deploy-infrastructure/index.mts",
        label: "deploy-infrastructure",
        description: "Plan (and, after manual approval, apply) Terraform/Atmos changes to prod",
        usageHint: "./scripts/deploy-infrastructure/index.mts",
      },
    ],
  },
  {
    label: "Deploy (local machine)",
    description: "Build and deploy directly from this laptop, bypassing GitHub Actions (requires local AWS/Docker/Atmos)",
    scripts: [
      {
        file: "deploy-backend-local/index.mts",
        label: "deploy-backend-local",
        description: "Build backend Docker image locally, push to ECR, and apply the ECS task via Atmos",
        usageHint: "./scripts/deploy-backend-local/index.mts [image-tag]",
      },
      {
        file: "deploy-frontend-local/index.mts",
        label: "deploy-frontend-local",
        description: "Build the React app locally and sync it to S3 + invalidate CloudFront",
        usageHint: "./scripts/deploy-frontend-local/index.mts",
      },
      {
        file: "deploy-content-local/index.mts",
        label: "deploy-content-local",
        description: "Upload content/topics/topics.txt to the fristajl-prod-topics S3 bucket",
        usageHint: "./scripts/deploy-content-local/index.mts",
      },
      {
        file: "deploy-infrastructure-local/index.mts",
        label: "deploy-infrastructure-local",
        description: "Plan and apply Terraform/Atmos changes to prod directly (with an APPLY confirmation gate)",
        usageHint: "./scripts/deploy-infrastructure-local/index.mts",
      },
    ],
  },
];

console.log("");
p.intro(c.mauve.bold("fristajl.pl Dev Tools · index"));
console.log("");

const category = abortIfCancel(
  await p.select({
    message: "Select a category:",
    options: CATEGORIES.map((cat) => ({
      value: cat,
      label: `${c.text.bold(cat.label.padEnd(20))}  ${c.subtext0(cat.description)}`,
    })),
  }),
) as Category;

console.log("");

const script = abortIfCancel(
  await p.select({
    message: `Select a script (${category.label}):`,
    options: category.scripts.map((s) => ({
      value: s,
      label: `${c.text.bold(s.label.padEnd(25))}  ${c.subtext0(s.description)}`,
    })),
  }),
) as ScriptEntry;

console.log("");
console.log(c.lavender.bold(script.label));
console.log(`  ${c.subtext0(script.description)}`);
console.log(`  ${c.overlay0("Usage: ")}${c.peach(script.usageHint)}`);
console.log("");

const scriptPath = path.join(SCRIPT_DIR, "scripts", script.file);

try {
  await $({ stdio: "inherit" })`npx tsx ${scriptPath}`;
} catch {
  p.outro(c.red("Script exited with an error."));
  process.exit(1);
}
