import { resolve } from "path";
import { scanDirectory } from "../scanners/index.js";
import { formatReport, formatJson } from "../reporters/index.js";

interface ScanOptions {
  json?: boolean;
  fix?: boolean;
}

export async function scan(
  directory: string,
  options: ScanOptions
): Promise<void> {
  const targetDir = resolve(directory);

  console.log(`\n🔍 Scanning: ${targetDir}\n`);

  const results = await scanDirectory(targetDir, { fix: options.fix ?? false });

  if (options.json) {
    console.log(formatJson(results));
  } else {
    console.log(formatReport(results));
  }

  const errorCount = results.issues.filter((i) => i.severity === "error").length;
  process.exit(errorCount > 0 ? 1 : 0);
}
