import { readdir, stat } from "fs/promises";
import { join } from "path";
import type { ScanResult, FileInfo, Issue, ScanOptions } from "../types.js";
import { scanClaudeMd } from "./claude-md.js";
import { scanSettingsJson } from "./settings-json.js";

const CLAUDE_CODE_FILES: Record<string, FileInfo["type"]> = {
  "CLAUDE.md": "claude-md",
  ".claude/settings.json": "settings-json",
  ".claude/settings.local.json": "settings-local-json",
};

export async function scanDirectory(
  directory: string,
  options: ScanOptions
): Promise<ScanResult> {
  const files: FileInfo[] = [];
  const issues: Issue[] = [];

  // Check known Claude Code files
  for (const [relativePath, type] of Object.entries(CLAUDE_CODE_FILES)) {
    const fullPath = join(directory, relativePath);
    const exists = await fileExists(fullPath);
    files.push({ path: relativePath, type, exists });
  }

  // Also check for nested CLAUDE.md files
  const nestedClaudeMds = await findNestedClaudeMds(directory, 3);
  for (const path of nestedClaudeMds) {
    if (!files.some((f) => f.path === path)) {
      files.push({ path, type: "claude-md", exists: true });
    }
  }

  // Run scanners on found files
  for (const file of files) {
    if (!file.exists) continue;

    const fullPath = join(directory, file.path);
    switch (file.type) {
      case "claude-md":
        issues.push(...(await scanClaudeMd(fullPath, file.path)));
        break;
      case "settings-json":
      case "settings-local-json":
        issues.push(...(await scanSettingsJson(fullPath, file.path)));
        break;
    }
  }

  // Add info if no CLAUDE.md found at root
  const rootClaudeMd = files.find(
    (f) => f.path === "CLAUDE.md" && f.type === "claude-md"
  );
  if (!rootClaudeMd?.exists) {
    issues.push({
      file: "CLAUDE.md",
      severity: "info",
      code: "NO_ROOT_CLAUDE_MD",
      message: "No CLAUDE.md found in project root. Consider creating one for project instructions.",
    });
  }

  return {
    directory,
    files: files.filter((f) => f.exists),
    issues,
    summary: {
      filesScanned: files.filter((f) => f.exists).length,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
      infos: issues.filter((i) => i.severity === "info").length,
    },
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function findNestedClaudeMds(
  dir: string,
  maxDepth: number,
  currentDepth = 0,
  basePath = ""
): Promise<string[]> {
  if (currentDepth >= maxDepth) return [];
  const results: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.isFile() && entry.name === "CLAUDE.md" && currentDepth > 0) {
        results.push(relativePath);
      } else if (entry.isDirectory()) {
        results.push(
          ...(await findNestedClaudeMds(
            join(dir, entry.name),
            maxDepth,
            currentDepth + 1,
            relativePath
          ))
        );
      }
    }
  } catch {
    // Permission denied or other FS error
  }

  return results;
}
