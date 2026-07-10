import { readFile } from "node:fs/promises";
import path from "node:path";

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseEnv(content) {
  const entries = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = normalized.slice(0, equalsIndex).trim();
    const value = stripQuotes(normalized.slice(equalsIndex + 1));
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) entries.push([key, value]);
  }

  return entries;
}

export async function loadLocalEnv(root, files = [".env.local", ".env"]) {
  const loaded = [];

  for (const file of files) {
    const envPath = path.join(root, file);
    let content = "";
    try {
      content = await readFile(envPath, "utf8");
    } catch {
      continue;
    }

    for (const [key, value] of parseEnv(content)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    loaded.push(file);
  }

  return loaded;
}
