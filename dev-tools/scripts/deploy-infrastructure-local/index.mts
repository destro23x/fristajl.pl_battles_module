#!/usr/bin/env -S npx tsx
//
// Plan and apply Terraform/Atmos infrastructure changes directly from this
// laptop, without going through GitHub Actions. Mirrors the plan/apply order
// in .github/workflows/infrastructure.yml (core is applied first so the
// later plans, which read its remote state, succeed).
//
// Usage: ./scripts/deploy-infrastructure-local/index.mts
//

import { $ } from "zx";
import * as p from "@clack/prompts";
import * as path from "node:path";
import { c, abortIfCancel, ensureAwsCli } from "../lib/index.mts";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const INFRA_DIR = path.join(REPO_ROOT, "infrastructure");

// [workflow file, stack file] pairs, in dependency order.
const STACKS: Array<[string, string]> = [
  ["all-core", "core.yaml"],
  ["all-networking", "networking.yaml"],
  ["all-security", "security.yaml"],
  ["all-storage", "storage.yaml"],
  ["all-alb", "app.yaml"],
  ["all-ecs", "app.yaml"],
];

console.log("");
p.intro(c.mauve.bold("Deploy infrastructure (local)"));
console.log(`  ${c.yellow("Warning:")} this plans AND applies Terraform changes to real AWS prod resources.`);
console.log("");

await ensureAwsCli();

p.log.step("Pulling Atmos vendor modules...");
await $({ stdio: "inherit", cwd: INFRA_DIR })`atmos vendor pull`;

p.log.step("Planning all stacks (core, networking, security, storage, alb, ecs)...");
for (const [workflow, stackFile] of STACKS) {
  await $({ stdio: "inherit", cwd: INFRA_DIR })`atmos workflow plan-${workflow} -f ${stackFile}`;
}

const typed = abortIfCancel(
  await p.text({
    message: `Review the plans above. Type ${c.peach("APPLY")} to apply them all to prod:`,
    validate: (v) => (v !== "APPLY" ? 'You must type "APPLY" exactly to proceed.' : undefined),
  }),
) as string;
if (typed !== "APPLY") {
  p.cancel("Cancelled — nothing was applied.");
  process.exit(0);
}

for (const [workflow, stackFile] of STACKS) {
  p.log.step(`Applying ${workflow}...`);
  await $({ stdio: "inherit", cwd: INFRA_DIR })`atmos workflow apply-${workflow} -f ${stackFile}`;
}

p.outro(c.green("Done ✔"));
