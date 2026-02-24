import { Command } from "commander";
import { log } from "../utils/logger.js";
import { requireValidTxHash, requireValidAddress } from "../utils/validator.js";
import { ARC_TESTNET } from "../config/constants.js";

async function openInBrowser(url: string): Promise<void> {
  const open = (await import("open")).default;
  await open(url);
  log.success(`Opened: ${url}`);
}

export function registerExploreCommand(program: Command): void {
  const explore = program.command("explore").description("Open resources in Arc block explorer");

  explore
    .command("tx <hash>")
    .description("Open transaction in explorer")
    .action(async (hash: string) => {
      requireValidTxHash(hash);
      const url = `${ARC_TESTNET.explorer}/tx/${hash}`;
      await openInBrowser(url);
    });

  explore
    .command("address <addr>")
    .description("Open address in explorer")
    .action(async (addr: string) => {
      requireValidAddress(addr);
      const url = `${ARC_TESTNET.explorer}/address/${addr}`;
      await openInBrowser(url);
    });

  explore
    .command("contract <addr>")
    .description("Open contract in explorer")
    .action(async (addr: string) => {
      requireValidAddress(addr);
      const url = `${ARC_TESTNET.explorer}/address/${addr}`;
      await openInBrowser(url);
    });
}
