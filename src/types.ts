export type Severity = "error" | "warning" | "info";

export interface Issue {
  file: string;
  severity: Severity;
  code: string;
  message: string;
  line?: number;
  fix?: string;
}

export interface FileInfo {
  path: string;
  type: "claude-md" | "settings-json" | "settings-local-json" | "skill-md" | "other";
  exists: boolean;
}

export interface ScanResult {
  directory: string;
  files: FileInfo[];
  issues: Issue[];
  summary: {
    filesScanned: number;
    errors: number;
    warnings: number;
    infos: number;
  };
}

export interface ScanOptions {
  fix: boolean;
}
