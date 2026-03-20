import { readFile } from "fs/promises";
import type { Issue } from "../types.js";

export async function scanClaudeMd(
  fullPath: string,
  relativePath: string
): Promise<Issue[]> {
  const issues: Issue[] = [];
  let content: string;

  try {
    content = await readFile(fullPath, "utf-8");
  } catch {
    issues.push({
      file: relativePath,
      severity: "error",
      code: "READ_ERROR",
      message: "Failed to read file",
    });
    return issues;
  }

  // Check if file is empty
  if (content.trim().length === 0) {
    issues.push({
      file: relativePath,
      severity: "warning",
      code: "EMPTY_CLAUDE_MD",
      message: "File is empty. Add project instructions for Claude Code.",
    });
    return issues;
  }

  const lines = content.split("\n");

  // Check for H1 heading
  const hasH1 = lines.some((line) => /^# .+/.test(line));
  if (!hasH1) {
    issues.push({
      file: relativePath,
      severity: "warning",
      code: "NO_H1_HEADING",
      message: "No H1 heading found. CLAUDE.md should start with a clear title.",
      line: 1,
    });
  }

  // Check for very long file (performance concern)
  if (lines.length > 500) {
    issues.push({
      file: relativePath,
      severity: "warning",
      code: "LARGE_FILE",
      message: `File has ${lines.length} lines. Large CLAUDE.md files may slow down context loading. Consider splitting into sections.`,
    });
  }

  // Check for TODO/FIXME markers left in instructions
  lines.forEach((line, index) => {
    if (/\b(TODO|FIXME|HACK|XXX)\b/.test(line)) {
      issues.push({
        file: relativePath,
        severity: "info",
        code: "TODO_MARKER",
        message: `Found TODO/FIXME marker: "${line.trim().substring(0, 80)}"`,
        line: index + 1,
      });
    }
  });

  // Check for potential secrets
  const secretPatterns = [
    { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?\w{20,}/i, name: "API key" },
    { pattern: /(?:secret|token|password)\s*[:=]\s*["']?\w{16,}/i, name: "Secret/Token" },
    { pattern: /sk-[a-zA-Z0-9]{20,}/, name: "OpenAI-style API key" },
    { pattern: /sk-ant-[a-zA-Z0-9-]{20,}/, name: "Anthropic API key" },
  ];

  lines.forEach((line, index) => {
    for (const { pattern, name } of secretPatterns) {
      if (pattern.test(line)) {
        issues.push({
          file: relativePath,
          severity: "error",
          code: "POTENTIAL_SECRET",
          message: `Potential ${name} found. Never put secrets in CLAUDE.md.`,
          line: index + 1,
        });
      }
    }
  });

  // Check for conflicting instructions
  const hasAlways = lines.some((l) => /\balways\b/i.test(l));
  const hasNever = lines.some((l) => /\bnever\b/i.test(l));
  if (hasAlways && hasNever) {
    issues.push({
      file: relativePath,
      severity: "info",
      code: "CONFLICTING_DIRECTIVES",
      message:
        'Found both "always" and "never" directives. Verify they don\'t contradict each other.',
    });
  }

  return issues;
}
