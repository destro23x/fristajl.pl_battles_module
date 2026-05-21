// Shared helpers for the fristajl.pl dev-tools scripts.

import { $, chalk } from "zx";
import * as p from "@clack/prompts";

$.verbose = false;

export const c = {
  mauve: chalk.hex("#cba6f7"),
  lavender: chalk.hex("#b4befe"),
  text: chalk.white,
  subtext0: chalk.gray,
  overlay0: chalk.dim,
  peach: chalk.hex("#fab387"),
  green: chalk.green,
  red: chalk.red,
  yellow: chalk.yellow,
};

export function abortIfCancel<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  return value as T;
}

// All fristajl.pl workflows are workflow_dispatch-only (see .github/workflows), so
// triggering them requires the GitHub CLI to be installed and authenticated.
export async function ensureGhCli(): Promise<void> {
  try {
    await $`gh --version`;
  } catch {
    p.log.error(`${c.red("GitHub CLI (gh) not found.")} Install it first: ${c.peach("brew install gh")}`);
    process.exit(1);
  }

  try {
    await $`gh auth status`;
  } catch {
    p.log.error(`${c.red("Not logged in to GitHub CLI.")} Run ${c.peach("gh auth login")} first.`);
    process.exit(1);
  }
}

export async function runWorkflow(workflowFile: string, inputs: Record<string, string> = {}): Promise<void> {
  const args = ["workflow", "run", workflowFile];
  for (const [key, value] of Object.entries(inputs)) {
    args.push("-f", `${key}=${value}`);
  }
  await $({ stdio: "inherit" })`gh ${args}`;
}

// `gh workflow run` doesn't return the new run's id, so poll the workflow's
// run list until a fresh one shows up, then attach to it.
export async function watchLatestRun(workflowFile: string): Promise<void> {
  p.log.info("Waiting for GitHub to pick up the run...");

  let run: { databaseId: number; url: string; status: string } | undefined;
  for (let attempt = 0; attempt < 10 && !run; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const result = await $`gh run list --workflow=${workflowFile} --limit 1 --json databaseId,url,status`;
    [run] = JSON.parse(result.stdout);
  }

  if (!run) {
    p.log.warn(`Couldn't find the triggered run automatically — check it with: ${c.peach(`gh run list --workflow=${workflowFile}`)}`);
    return;
  }

  p.log.info(`Watching run: ${c.lavender(run.url)}`);
  await $({ stdio: "inherit" })`gh run watch ${run.databaseId} --exit-status`;
}

export const AWS_REGION = process.env.AWS_REGION || "eu-central-1";

// Local (laptop) deploys hit AWS directly, so they need the AWS CLI configured
// with credentials that can assume the deploy role (e.g. via `aws sso login`).
export async function ensureAwsCli(): Promise<void> {
  try {
    await $`aws --version`;
  } catch {
    p.log.error(`${c.red("AWS CLI not found.")} Install it first: ${c.peach("brew install awscli")}`);
    process.exit(1);
  }

  try {
    await $`aws sts get-caller-identity`;
  } catch {
    p.log.error(`${c.red("AWS CLI is not authenticated.")} Run ${c.peach("aws sso login")} (or configure credentials) first.`);
    process.exit(1);
  }
}

export async function ensureDockerRunning(): Promise<void> {
  try {
    await $`docker info`;
  } catch {
    p.log.error(`${c.red("Docker doesn't seem to be running.")} Start Docker Desktop first.`);
    process.exit(1);
  }
}

export async function getAwsAccountId(): Promise<string> {
  const result = await $`aws sts get-caller-identity --query Account --output text`;
  return result.stdout.trim();
}

// Push an image both under its own tag and `:latest`, matching what backend.yml does.
export async function buildAndPushEcrImage(opts: {
  contextDir: string;
  dockerfile: string;
  repository: string;
  tag: string;
}): Promise<string> {
  const accountId = await getAwsAccountId();
  const registry = `${accountId}.dkr.ecr.${AWS_REGION}.amazonaws.com`;
  const imageUri = `${registry}/${opts.repository}:${opts.tag}`;

  p.log.step(`Logging in to ECR registry ${registry}...`);
  const password = (await $`aws ecr get-login-password --region ${AWS_REGION}`).stdout.trim();
  await $({ input: password })`docker login --username AWS --password-stdin ${registry}`;

  p.log.step(`Building ${opts.repository}:${opts.tag} (linux/amd64) and pushing to ECR...`);
  await $({
    stdio: "inherit",
  })`docker buildx build --platform linux/amd64 -f ${opts.dockerfile} -t ${imageUri} -t ${registry}/${opts.repository}:latest --push ${opts.contextDir}`;

  return imageUri;
}

export async function findCloudFrontDistributionId(alias: string): Promise<string | undefined> {
  const result =
    await $`aws cloudfront list-distributions --query "DistributionList.Items[?contains(Aliases.Items, '${alias}')].Id" --output text`;
  const id = result.stdout.trim();
  return id || undefined;
}
