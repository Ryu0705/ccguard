#!/usr/bin/env node
import { Command } from "commander";
import { scan } from "./commands/scan.js";

const program = new Command();

program
  .name("ccguard")
  .description("Validate, analyze, and optimize your Claude Code configuration")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan and validate Claude Code configuration files")
  .argument("[directory]", "Directory to scan", ".")
  .option("--json", "Output results as JSON")
  .option("--fix", "Auto-fix issues where possible")
  .action(scan);

program.parse();
