import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { log, table, spinner } from "../utils/logger.js";
import { validateAddress, validateAmount } from "../utils/validator.js";
import { sendNativeUSDC, sendERC20, waitForReceipt } from "../services/rpc.js";
import { ARC_TESTNET } from "../config/constants.js";

const TOKEN_ALIASES: Record<string, { address: string; decimals: number; name: string }> = {
  usdc: { address: ARC_TESTNET.contracts.USDC.address, decimals: 6, name: "USDC (ERC-20)" },
  eurc: { address: ARC_TESTNET.contracts.EURC.address, decimals: 6, name: "EURC" },
  usyc: { address: ARC_TESTNET.contracts.USYC.address, decimals: 6, name: "USYC" },
};

function resolveToken(token?: string): { address: string; decimals?: number; name: string } | null {
  if (!token) return null;
  const alias = TOKEN_ALIASES[token.toLowerCase()];
  if (alias) return alias;
  if (validateAddress(token)) return { address: token, name: token.slice(0, 10) + "..." };
  return null;
}

function loadAddresses(filePath: string): string[] {
  const fullPath = resolve(process.cwd(), filePath);

  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const content = readFileSync(fullPath, "utf-8");
  const addresses: string[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!validateAddress(trimmed)) {
      throw new Error(`Invalid address in file: ${trimmed}`);
    }
    addresses.push(trimmed);
  }

  return addresses;
}

export function registerMultisendCommand(program: Command): void {
  program
    .command("multisend")
    .description("Send USDC or ERC-20 tokens to multiple addresses from a file")
    .argument("<file>", "Text file with one wallet address per line (# for comments)")
    .argument("<amount>", "Amount to send to each address")
    .option(
      "-t, --token <token>",
      "Token to send: eurc, usyc, or contract address (default: native USDC)"
    )
    .addHelpText(
      "after",
      `
Example wallets.txt:
  # My recipients
  0x1234...abcd
  0x5678...efgh

Usage:
  $ arc multisend wallets.txt 0.5
  $ arc multisend wallets.txt 100 --token eurc
  $ arc multisend wallets.txt 50 --token 0x1234...  (custom token)
`
    )
    .action(async (file: string, amount: string, opts: { token?: string }) => {
      if (!validateAmount(amount)) {
        log.error(`Invalid amount: ${amount}`);
        process.exitCode = 1;
        return;
      }

      let addresses: string[];
      try {
        addresses = loadAddresses(file);
      } catch (err) {
        log.error((err as Error).message);
        process.exitCode = 1;
        return;
      }

      if (addresses.length === 0) {
        log.error("No valid addresses found in file");
        process.exitCode = 1;
        return;
      }

      const token = resolveToken(opts.token);
      const tokenName = token ? token.name : "USDC";
      const isERC20 = !!token;

      const total = (parseFloat(amount) * addresses.length).toFixed(6);
      log.title("Multisend");
      log.label("Token", tokenName);
      log.label("Recipients", `${addresses.length}`);
      log.label("Amount each", `${amount} ${tokenName}`);
      log.label("Total", `${total} ${tokenName}`);
      log.newline();

      const results: { address: string; status: string; hash: string }[] = [];
      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < addresses.length; i++) {
        const addr = addresses[i];
        const s = spinner(
          `[${i + 1}/${addresses.length}] Sending ${amount} ${tokenName} to ${addr}...`
        );

        try {
          let hash: `0x${string}`;

          if (isERC20) {
            ({ hash } = await sendERC20({
              to: addr as `0x${string}`,
              amount,
              tokenAddress: token.address as `0x${string}`,
              decimals: token.decimals,
            }));
          } else {
            ({ hash } = await sendNativeUSDC({
              to: addr as `0x${string}`,
              amount,
            }));
          }

          s.text = `[${i + 1}/${addresses.length}] Waiting for confirmation...`;
          await waitForReceipt(hash);

          s.succeed(`[${i + 1}/${addresses.length}] ${addr}`);
          results.push({ address: addr, status: "Confirmed", hash });
          succeeded++;
        } catch (err) {
          s.fail(`[${i + 1}/${addresses.length}] ${addr}`);
          results.push({ address: addr, status: "Failed", hash: (err as Error).message });
          failed++;
        }
      }

      log.newline();
      log.title("Results");
      table(
        ["#", "Address", "Status", "Tx Hash"],
        results.map((r, i) => [
          String(i + 1),
          r.address,
          r.status,
          r.status === "Confirmed" ? r.hash : r.status,
        ])
      );

      log.newline();
      log.label("Succeeded", `${succeeded}/${addresses.length}`);
      if (failed > 0) {
        log.label("Failed", `${failed}/${addresses.length}`);
      }

      if (succeeded > 0) {
        log.newline();
        log.dim(`Explorer: ${ARC_TESTNET.explorer}`);
      }
    });
}
