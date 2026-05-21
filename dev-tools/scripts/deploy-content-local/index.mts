#!/usr/bin/env -S npx tsx
//
// Upload content/topics/topics.txt to S3 directly from this laptop, without
// going through GitHub Actions. Mirrors .github/workflows/content.yml.
//
// Usage: ./scripts/deploy-content-local/index.mts
//

import { $ } from "zx";
import * as p from "@clack/prompts";
import * as path from "node:path";
import { c, abortIfCancel, ensureAwsCli } from "../lib/index.mts";

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const TOPICS_FILE = path.join(REPO_ROOT, "content", "topics", "topics.txt");
const TOPICS_S3_BUCKET = "fristajl-prod-topics";

console.log("");
p.intro(c.mauve.bold("Deploy content (local)"));

await ensureAwsCli();

const confirmed = abortIfCancel(
  await p.confirm({ message: `Upload topics.txt to ${c.peach(`s3://${TOPICS_S3_BUCKET}/topics.txt`)}?` }),
);
if (!confirmed) {
  p.cancel("Cancelled.");
  process.exit(0);
}

await $({ stdio: "inherit" })`aws s3 cp ${TOPICS_FILE} s3://${TOPICS_S3_BUCKET}/topics.txt --sse AES256`;

p.outro(c.green("Done ✔"));
