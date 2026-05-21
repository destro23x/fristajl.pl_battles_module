#!/usr/bin/env -S npx tsx
//
// Trigger the "Build and Deploy Backend" GitHub Actions workflow
// (.github/workflows/backend.yml) without pushing to main.
//
// Usage: ./scripts/deploy-backend/index.mts [image-tag]
//

import * as p from "@clack/prompts";
import { c, abortIfCancel, ensureGhCli, runWorkflow, watchLatestRun } from "../lib/index.mts";

const WORKFLOW_FILE = "backend.yml";

await ensureGhCli();

console.log("");
p.intro(c.mauve.bold("Deploy backend"));

let imageTag = process.argv[2];
if (!imageTag) {
  imageTag = abortIfCancel(
    await p.text({
      message: "Image tag (leave blank to use the commit short SHA):",
      placeholder: "e.g. hotfix-health",
    }),
  ) as string;
}

const confirmed = abortIfCancel(
  await p.confirm({
    message: `Trigger ${c.peach(WORKFLOW_FILE)}${imageTag ? ` with image_tag=${imageTag}` : " (default image_tag)"}?`,
  }),
);
if (!confirmed) {
  p.cancel("Cancelled.");
  process.exit(0);
}

await runWorkflow(WORKFLOW_FILE, imageTag?.trim() ? { image_tag: imageTag.trim() } : {});

const watch = abortIfCancel(await p.confirm({ message: "Watch the run until it finishes?", initialValue: true }));
if (watch) await watchLatestRun(WORKFLOW_FILE);

p.outro(c.green("Done ✔"));
