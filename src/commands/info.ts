import { Command } from "commander";
import { log, table } from "../utils/logger.js";
import { EVM_DIFFERENCES, PROVIDERS } from "../config/constants.js";

export function registerInfoCommand(program: Command): void {
  const info = program
    .command("info")
    .description("Arc network information and ecosystem");

  info
    .command("evm")
    .description("Show EVM compatibility differences between Ethereum and Arc")
    .action(() => {
      log.title("EVM Compatibility: Ethereum vs Arc");
      table(
        ["Area", "Ethereum", "Arc"],
        EVM_DIFFERENCES.map((d) => [d.area, d.ethereum, d.arc]),
      );

      log.newline();
      log.title("Developer Notes");
      console.log("  - Gas is denominated in USDC, display values in USD terms");
      console.log("  - Multiple blocks may share timestamps, avoid strictly increasing assumptions");
      console.log("  - block.prevrandao is always 0, use external oracle/VRF for randomness");
      console.log("  - Transactions finalize immediately, safe to act on single confirmation");
      console.log("  - SELFDESTRUCT restricted during deployment");
    });

  info
    .command("providers")
    .description("List node providers, data indexers, and AA providers")
    .option("-c, --category <cat>", "Filter by category (node, indexer, aa, compliance, explorer)")
    .action((opts) => {
      const filteredProviders = opts.category
        ? PROVIDERS.filter((p) => p.category === opts.category)
        : PROVIDERS;

      if (filteredProviders.length === 0) {
        log.error(`No providers found for category: ${opts.category}`);
        log.dim("Available categories: node, indexer, aa, compliance, explorer");
        process.exitCode = 1;
        return;
      }

      const categoryNames: Record<string, string> = {
        node: "Node Providers",
        indexer: "Data Indexers",
        aa: "Account Abstraction Providers",
        compliance: "Compliance Vendors",
        explorer: "Block Explorers",
      };

      if (opts.category) {
        log.title(categoryNames[opts.category] || opts.category);
        table(
          ["Name", "URL", "Description"],
          filteredProviders.map((p) => [p.name, p.url, p.description]),
        );
      } else {
        const grouped = new Map<string, typeof PROVIDERS>();
        for (const p of PROVIDERS) {
          const existing = grouped.get(p.category) || [];
          existing.push(p);
          grouped.set(p.category, existing);
        }

        for (const [cat, providers] of grouped) {
          log.title(categoryNames[cat] || cat);
          table(
            ["Name", "URL", "Description"],
            providers.map((p) => [p.name, p.url, p.description]),
          );
          log.newline();
        }
      }
    });

  info
    .command("compliance")
    .description("List compliance vendors for Arc")
    .action(() => {
      const complianceProviders = PROVIDERS.filter((p) => p.category === "compliance");

      log.title("Compliance Vendors");
      table(
        ["Name", "URL", "Description"],
        complianceProviders.map((p) => [p.name, p.url, p.description]),
      );

      log.newline();
      log.dim("These providers offer analytics, wallet screening, and monitoring for regulatory compliance.");
    });
}
