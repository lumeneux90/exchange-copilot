import { readdir } from "node:fs/promises";
import path from "node:path";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".pnpm-store",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);
const duplicateCopyPattern = / [2-9](?=\.[^.]+$)/;
const rootDirectory = process.cwd();

async function findCopyArtifacts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const artifacts = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      artifacts.push(
        ...(await findCopyArtifacts(path.join(directory, entry.name)))
      );
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (duplicateCopyPattern.test(entry.name)) {
      artifacts.push(path.relative(rootDirectory, path.join(directory, entry.name)));
    }
  }

  return artifacts;
}

const artifacts = await findCopyArtifacts(rootDirectory);

if (artifacts.length > 0) {
  console.error("Found duplicate copy artifacts:");

  for (const artifact of artifacts) {
    console.error(`- ${artifact}`);
  }

  process.exit(1);
}

console.log("No duplicate copy artifacts found.");
