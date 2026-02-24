import { Command } from "commander";
import { log } from "../utils/logger.js";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

const DOCS_URL = "https://developers.circle.com/arc";

function findDocsDir(): string | null {
  const candidates = [join(process.cwd(), "arc-docs"), join(process.cwd(), "..", "arc-docs")];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  return null;
}

function searchFiles(
  dir: string,
  query: string
): Array<{ file: string; line: number; text: string }> {
  const results: Array<{ file: string; line: number; text: string }> = [];
  const queryLower = query.toLowerCase();

  function walk(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const content = readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(queryLower)) {
            results.push({
              file: relative(dir, fullPath),
              line: i + 1,
              text: lines[i].trim().slice(0, 120),
            });
          }
        }
      }
    }
  }

  walk(dir);
  return results;
}

export function registerDocsCommand(program: Command): void {
  const docs = program.command("docs").description("Arc documentation access");

  docs
    .command("open")
    .description("Open Arc documentation in browser")
    .action(async () => {
      log.info(`Opening Arc docs: ${DOCS_URL}`);
      const open = (await import("open")).default;
      await open(DOCS_URL);
      log.success("Documentation opened in browser");
    });

  docs
    .command("search <query>")
    .description("Search local arc-docs/ for a keyword")
    .option("-l, --limit <number>", "Maximum results to show", "20")
    .action((query: string, opts) => {
      const docsDir = findDocsDir();

      if (!docsDir) {
        log.error("arc-docs/ directory not found.");
        log.dim("Make sure you have the arc-docs/ directory in your project root.");
        process.exitCode = 1;
        return;
      }

      const results = searchFiles(docsDir, query);

      if (results.length === 0) {
        log.warn(`No results found for "${query}"`);
        return;
      }

      const limit = Number(opts.limit);
      const shown = results.slice(0, limit);

      log.title(`Search results for "${query}" (${results.length} matches)`);

      for (const result of shown) {
        console.log(`  ${result.file}:${result.line}`);
        console.log(`    ${result.text}`);
        console.log();
      }

      if (results.length > limit) {
        log.dim(`...and ${results.length - limit} more results. Use --limit to show more.`);
      }
    });
}
