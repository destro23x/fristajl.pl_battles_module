#!/usr/bin/env -S npx tsx
//
// Trigger the "Build and Deploy Frontend" GitHub Actions workflow
// (.github/workflows/frontend.yml) without pushing to main.
//
// Usage: ./scripts/deploy-frontend/index.mts
//

import * as p from "@clack/prompts";
import { c, abortIfCancel, ensureGhCli, runWorkflow, watchLatestRun } from "../lib/index.mts";

const WORKFLOW_FILE = "frontend.yml";

await ensureGhCli();

console.log("");
p.intro(c.mauve.bold("Deploy frontend"));

const confirmed = abortIfCancel(
  await p.confirm({ message: `Trigger ${c.peach(WORKFLOW_FILE)} (build + sync to S3 + CloudFront invalidation)?` }),
);
if (!confirmed) {
  p.cancel("Cancelled.");
  process.exit(0);
}

await runWorkflow(WORKFLOW_FILE);

const watch = abortIfCancel(await p.confirm({ message: "Watch the run until it finishes?", initialValue: true }));
if (watch) await watchLatestRun(WORKFLOW_FILE);

p.outro(c.green("Done ✔"));
