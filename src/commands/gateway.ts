import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { validateAmount } from "../utils/validator.js";
import * as gateway from "../services/gateway.js";

export function registerGatewayCommand(program: Command): void {
  const gw = program
    .command("gateway")
    .description("Circle Gateway - unified crosschain USDC balance")
    .addHelpText("after", `
Requires Circle API credentials:
  arc config set api-key <your-key>
  arc config set entity-secret <your-secret>

Gateway provides a unified USDC balance across multiple chains.
Learn more: https://developers.circle.com/circle-mint/docs/gateway
`);

  gw
    .command("deposit")
    .description("Deposit USDC into Gateway unified balance")
    .option("-w, --wallet-id <id>", "Circle wallet ID")
    .option("-a, --amount <amount>", "Amount to deposit")
    .addHelpText("after", `
Example:
  $ arc gateway deposit -w wallet123 -a 100
`)
    .action(async (opts: { walletId?: string; amount?: string }) => {
      if (!opts.walletId) {
        log.error("Wallet ID required. Use -w <wallet-id>");
        process.exitCode = 1;
        return;
      }
      if (!opts.amount || !validateAmount(opts.amount)) {
        log.error("Invalid or missing amount. Use -a <amount>");
        process.exitCode = 1;
        return;
      }

      log.title("Gateway Deposit");
      log.label("Wallet", opts.walletId);
      log.label("Amount", `${opts.amount} USDC`);
      log.newline();

      const s = spinner("Depositing to Gateway...");
      try {
        const result = await gateway.depositToGateway({
          walletId: opts.walletId,
          amount: opts.amount,
        });
        s.succeed("Deposit initiated");

        if (result) {
          const data = result as unknown as Record<string, unknown>;
          log.newline();
          table(
            ["Field", "Value"],
            [
              ["Transaction ID", String(data.id || "")],
              ["State", String(data.state || "")],
              ["Amount", `${opts.amount} USDC`],
            ],
          );
        }
      } catch (err) {
        s.fail("Deposit failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  gw
    .command("transfer")
    .description("Transfer USDC via Gateway to another chain")
    .option("-w, --wallet-id <id>", "Circle wallet ID")
    .option("-t, --to <address>", "Destination address")
    .option("-c, --chain <blockchain>", "Destination blockchain (e.g., ETH-SEPOLIA, BASE-SEPOLIA)")
    .option("-a, --amount <amount>", "Amount to transfer")
    .addHelpText("after", `
Example:
  $ arc gateway transfer -w wallet123 -t 0xDest... -c ETH-SEPOLIA -a 50
`)
    .action(async (opts: { walletId?: string; to?: string; chain?: string; amount?: string }) => {
      if (!opts.walletId) {
        log.error("Wallet ID required. Use -w <wallet-id>");
        process.exitCode = 1;
        return;
      }
      if (!opts.to) {
        log.error("Destination address required. Use -t <address>");
        process.exitCode = 1;
        return;
      }
      if (!opts.chain) {
        log.error("Destination chain required. Use -c <blockchain>");
        process.exitCode = 1;
        return;
      }
      if (!opts.amount || !validateAmount(opts.amount)) {
        log.error("Invalid or missing amount. Use -a <amount>");
        process.exitCode = 1;
        return;
      }

      log.title("Gateway Transfer");
      log.label("Wallet", opts.walletId);
      log.label("To", opts.to);
      log.label("Chain", opts.chain);
      log.label("Amount", `${opts.amount} USDC`);
      log.newline();

      const s = spinner("Transferring via Gateway...");
      try {
        const result = await gateway.transferViaGateway({
          walletId: opts.walletId,
          destinationAddress: opts.to,
          destinationBlockchain: opts.chain,
          amount: opts.amount,
        });
        s.succeed("Gateway transfer initiated");

        if (result) {
          const data = result as unknown as Record<string, unknown>;
          log.newline();
          table(
            ["Field", "Value"],
            [
              ["Transaction ID", String(data.id || "")],
              ["State", String(data.state || "")],
              ["To", opts.to],
              ["Chain", opts.chain],
              ["Amount", `${opts.amount} USDC`],
            ],
          );
        }
      } catch (err) {
        s.fail("Transfer failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  gw
    .command("balance")
    .description("Check Gateway unified balance")
    .argument("<walletId>", "Circle wallet ID")
    .action(async (walletId: string) => {
      const s = spinner("Fetching Gateway balance...");
      try {
        const balances = await gateway.getGatewayBalance(walletId);
        s.succeed("Balance fetched");

        if (balances && balances.length > 0) {
          log.newline();
          table(
            ["Token", "Amount"],
            balances.map((b) => [
              String(b.token?.symbol || b.token?.name || "Unknown"),
              String(b.amount || "0"),
            ]),
          );
        } else {
          log.warn("No balances found for this wallet.");
          log.dim("Deposit first: arc gateway deposit -w <wallet-id> -a <amount>");
        }
      } catch (err) {
        s.fail("Failed to fetch balance");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
