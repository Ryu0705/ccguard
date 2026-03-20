import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { scanDirectory } from "../src/scanners/index.js";

let testDir: string;

beforeEach(async () => {
  testDir = await mkdtemp(join(tmpdir(), "ccguard-test-"));
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe("scanDirectory", () => {
  it("reports missing CLAUDE.md", async () => {
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "NO_ROOT_CLAUDE_MD")).toBe(true);
  });

  it("detects empty CLAUDE.md", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "");
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "EMPTY_CLAUDE_MD")).toBe(true);
  });

  it("detects missing H1 heading", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "Some content without heading\n");
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "NO_H1_HEADING")).toBe(true);
  });

  it("passes valid CLAUDE.md", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "# My Project\n\nInstructions here.\n");
    const result = await scanDirectory(testDir, { fix: false });
    const claudeIssues = result.issues.filter(
      (i) => i.file === "CLAUDE.md" && i.severity === "error"
    );
    expect(claudeIssues).toHaveLength(0);
  });

  it("detects potential secrets in CLAUDE.md", async () => {
    await writeFile(
      join(testDir, "CLAUDE.md"),
      '# Project\n\napi_key: "sk-ant-abc123def456ghi789jkl012mno345"\n'
    );
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "POTENTIAL_SECRET")).toBe(true);
  });

  it("detects invalid JSON in settings", async () => {
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(join(testDir, ".claude/settings.json"), "{ invalid json }");
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "INVALID_JSON")).toBe(true);
  });

  it("detects unknown keys in settings", async () => {
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(
      join(testDir, ".claude/settings.json"),
      JSON.stringify({ unknownKey: true })
    );
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "UNKNOWN_KEY")).toBe(true);
  });

  it("detects duplicate permissions", async () => {
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(
      join(testDir, ".claude/settings.json"),
      JSON.stringify({
        permissions: { allow: ["WebSearch", "WebSearch"] },
      })
    );
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "DUPLICATE_PERMISSION")).toBe(true);
  });

  it("detects secrets in permission rules", async () => {
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(
      join(testDir, ".claude/settings.json"),
      JSON.stringify({
        permissions: { allow: ["Bash(API_KEY=mysecretkey123 npm run:*)"] },
      })
    );
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.issues.some((i) => i.code === "SECRET_IN_PERMISSION")).toBe(true);
  });

  it("provides correct summary counts", async () => {
    await writeFile(join(testDir, "CLAUDE.md"), "no heading\n");
    await mkdir(join(testDir, ".claude"), { recursive: true });
    await writeFile(join(testDir, ".claude/settings.json"), "not json");
    const result = await scanDirectory(testDir, { fix: false });
    expect(result.summary.filesScanned).toBeGreaterThan(0);
    expect(result.summary.errors).toBeGreaterThan(0);
  });
});
