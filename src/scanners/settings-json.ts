import { readFile } from "fs/promises";
import type { Issue } from "../types.js";

export async function scanSettingsJson(
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

  // Check valid JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    issues.push({
      file: relativePath,
      severity: "error",
      code: "INVALID_JSON",
      message: `Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`,
    });
    return issues;
  }

  // Check for known top-level keys
  const knownKeys = ["permissions", "env", "enabledPlugins", "extraKnownMarketplaces"];
  for (const key of Object.keys(parsed)) {
    if (!knownKeys.includes(key)) {
      issues.push({
        file: relativePath,
        severity: "warning",
        code: "UNKNOWN_KEY",
        message: `Unknown top-level key "${key}". Known keys: ${knownKeys.join(", ")}`,
      });
    }
  }

  // Check permissions structure
  const permissions = parsed.permissions as Record<string, unknown> | undefined;
  if (permissions) {
    // Check allow list
    const allow = permissions.allow;
    if (allow && Array.isArray(allow)) {
      // Check for overly broad Bash permissions
      const hasBroadBash = allow.some(
        (p: unknown) => typeof p === "string" && p === "Bash"
      );
      if (hasBroadBash) {
        issues.push({
          file: relativePath,
          severity: "warning",
          code: "BROAD_BASH_PERMISSION",
          message:
            'Unrestricted "Bash" permission found. Consider scoping to specific commands (e.g., "Bash(git:*)").',
        });
      }

      // Check for duplicate permissions
      const seen = new Set<string>();
      for (const perm of allow) {
        if (typeof perm === "string") {
          if (seen.has(perm)) {
            issues.push({
              file: relativePath,
              severity: "info",
              code: "DUPLICATE_PERMISSION",
              message: `Duplicate permission: "${perm}"`,
            });
          }
          seen.add(perm);
        }
      }

      // Check for potential secrets in permissions
      for (const perm of allow) {
        if (typeof perm === "string" && /(?:KEY|SECRET|TOKEN|PASSWORD)=/i.test(perm)) {
          issues.push({
            file: relativePath,
            severity: "error",
            code: "SECRET_IN_PERMISSION",
            message: "Potential secret found in permission rule. Use environment variables instead.",
          });
        }
      }
    }

    // Check additionalDirectories
    const dirs = permissions.additionalDirectories;
    if (dirs && Array.isArray(dirs)) {
      for (const dir of dirs) {
        if (typeof dir === "string" && (dir === "/" || dir === "/Users")) {
          issues.push({
            file: relativePath,
            severity: "warning",
            code: "BROAD_DIRECTORY_ACCESS",
            message: `Very broad directory access: "${dir}". Consider narrowing the scope.`,
          });
        }
      }
    }
  }

  // Check env for potential secrets
  const env = parsed.env as Record<string, string> | undefined;
  if (env) {
    for (const [key, value] of Object.entries(env)) {
      if (
        /(?:SECRET|TOKEN|PASSWORD|API_KEY)/i.test(key) &&
        typeof value === "string" &&
        value.length > 0
      ) {
        issues.push({
          file: relativePath,
          severity: "warning",
          code: "SECRET_IN_ENV",
          message: `Environment variable "${key}" may contain a secret. Consider using a .env file instead.`,
        });
      }
    }
  }

  return issues;
}
