import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceFiles(directory: string): string[] {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("runtime independence", () => {
  it("contains no Lovable service, package, CDN or editor references in executable source", () => {
    const files = ["src", "api", "functions/src"].flatMap(sourceFiles);
    for (const path of files.filter((path) => /\.(tsx?|js|json|css)$/.test(path))) {
      expect(read(path), path).not.toMatch(/lovable|gptengineer|gpt-eng\.com|__l5e|assets-v1/i);
    }
    for (const path of [
      "package.json",
      "package-lock.json",
      "functions/package.json",
      "functions/package-lock.json",
      "vite.config.ts",
      "vercel.json",
      "bunfig.toml",
    ]) {
      expect(read(path), path).not.toMatch(/lovable|__l5e|assets-v1/i);
    }
    expect(existsSync(join(root, "bun.lock"))).toBe(false);
  });

  it("does not invent or leave an unprotected scheduled job or secret consumer", () => {
    const vercel: { crons?: unknown } = JSON.parse(read("vercel.json"));
    expect(vercel.crons).toBeUndefined();
    const files = ["src", "api", "functions/src", "supabase", "drizzle"].flatMap(sourceFiles);
    for (const path of files.filter((path) => /\.(tsx?|js|sql|toml)$/.test(path))) {
      expect(read(path), path).not.toMatch(
        /CRON_SECRET|authenticateCronRequest|onSchedule\s*\(|cron\.schedule\s*\(|pg_cron/i,
      );
    }
    expect(existsSync(join(root, "src", "integrations", "supabase", "cron-auth.ts"))).toBe(false);
  });
});
