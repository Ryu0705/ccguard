import type { ScanResult, Severity } from "../types.js";

const SEVERITY_ICON: Record<Severity, string> = {
  error: "✖",
  warning: "⚠",
  info: "ℹ",
};

const SEVERITY_COLOR: Record<Severity, string> = {
  error: "\x1b[31m",
  warning: "\x1b[33m",
  info: "\x1b[36m",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

export function formatReport(result: ScanResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`${BOLD}ccguard v0.1.0${RESET}`);
  lines.push(`${DIM}${"─".repeat(50)}${RESET}`);

  // Files found
  lines.push(`\n${BOLD}Files scanned:${RESET} ${result.summary.filesScanned}`);
  for (const file of result.files) {
    lines.push(`  ${DIM}•${RESET} ${file.path} ${DIM}(${file.type})${RESET}`);
  }

  // Issues
  if (result.issues.length === 0) {
    lines.push(`\n${BOLD}\x1b[32m✓ No issues found!${RESET}`);
  } else {
    lines.push(`\n${BOLD}Issues:${RESET}\n`);

    // Group by file
    const byFile = new Map<string, typeof result.issues>();
    for (const issue of result.issues) {
      const existing = byFile.get(issue.file) ?? [];
      existing.push(issue);
      byFile.set(issue.file, existing);
    }

    for (const [file, issues] of byFile) {
      lines.push(`  ${BOLD}${file}${RESET}`);
      for (const issue of issues) {
        const icon = SEVERITY_ICON[issue.severity];
        const color = SEVERITY_COLOR[issue.severity];
        const lineNum = issue.line ? `:${issue.line}` : "";
        lines.push(
          `    ${color}${icon}${RESET} ${issue.message} ${DIM}[${issue.code}]${lineNum}${RESET}`
        );
      }
      lines.push("");
    }
  }

  // Summary
  lines.push(`${DIM}${"─".repeat(50)}${RESET}`);
  const parts: string[] = [];
  if (result.summary.errors > 0) {
    parts.push(`${SEVERITY_COLOR.error}${result.summary.errors} error(s)${RESET}`);
  }
  if (result.summary.warnings > 0) {
    parts.push(`${SEVERITY_COLOR.warning}${result.summary.warnings} warning(s)${RESET}`);
  }
  if (result.summary.infos > 0) {
    parts.push(`${SEVERITY_COLOR.info}${result.summary.infos} info(s)${RESET}`);
  }
  if (parts.length === 0) {
    parts.push("\x1b[32m0 issues\x1b[0m");
  }
  lines.push(`${BOLD}Summary:${RESET} ${parts.join("  ")}`);

  return lines.join("\n");
}

export function formatJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}
