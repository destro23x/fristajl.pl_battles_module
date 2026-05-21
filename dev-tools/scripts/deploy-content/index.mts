#!/usr/bin/env -S npx tsx
//
// Trigger the "Deploy Content" GitHub Actions workflow
// (.github/workflows/content.yml) to upload content/topics/topics.txt to S3.
//
// Usage: ./scripts/deploy-content/index.mts
//

import * as p from "@clack/prompts";
import { c, abortIfCancel, ensureGhCli, runWorkflow, watchLatestRun } from "../lib/index.mts";

const WORKFLOW_FILE = "content.yml";

await ensureGhCli();

console.log("");
p.intro(c.mauve.bold("Deploy content"));

const confirmed = abortIfCancel(
  await p.confirm({ message: `Trigger ${c.peach(WORKFLOW_FILE)} (upload content/topics/topics.txt to S3)?` }),
);
if (!confirmed) {
  p.cancel("Cancelled.");
  process.exit(0);
}

await runWorkflow(WORKFLOW_FILE);

const watch = abortIfCancel(await p.confirm({ message: "Watch the run until it finishes?", initialValue: true }));
if (watch) await watchLatestRun(WORKFLOW_FILE);

p.outro(c.green("Done ✔"));
