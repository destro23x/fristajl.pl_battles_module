#!/usr/bin/env -S npx tsx
//
// Trigger the "Infrastructure" GitHub Actions workflow
// (.github/workflows/infrastructure.yml) — plans, then (with a manual
// approval issue) applies Terraform/Atmos changes to real AWS prod resources.
//
// Usage: ./scripts/deploy-infrastructure/index.mts
//

import * as p from "@clack/prompts";
import { c, abortIfCancel, ensureGhCli, runWorkflow, watchLatestRun } from "../lib/index.mts";

const WORKFLOW_FILE = "infrastructure.yml";

await ensureGhCli();

console.log("");
p.intro(c.mauve.bold("Deploy infrastructure"));
console.log(
  `  ${c.yellow("Warning:")} this plans AND (after a manual approval issue) applies Terraform changes to real AWS prod resources.`,
);
console.log("");

const typed = abortIfCancel(
  await p.text({
    message: `Type ${c.peach("APPLY")} to confirm you want to run ${WORKFLOW_FILE}:`,
    validate: (v) => (v !== "APPLY" ? 'You must type "APPLY" exactly to proceed.' : undefined),
  }),
) as string;
if (typed !== "APPLY") {
  p.cancel("Cancelled.");
  process.exit(0);
}

await runWorkflow(WORKFLOW_FILE);

const watch = abortIfCancel(await p.confirm({ message: "Watch the run until it finishes?", initialValue: true }));
if (watch) await watchLatestRun(WORKFLOW_FILE);

p.outro(c.green("Done ✔"));
