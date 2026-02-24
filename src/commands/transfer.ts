import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { colorStatus } from "../utils/formatter.js";
import { validateAddress, validateAmount } from "../utils/validator.js";
import * as circleWallets from "../services/circle-wallets.js";
import { ARC_TESTNET } from "../config/constants.js";

async function doTransfer(
  tokenName: string,
  tokenAddress: string,
  opts: { from?: string; to?: string; amount?: string }
) {
  if (!opts.from || !validateAddress(opts.from)) {
    log.error(`Invalid or missing sender address. Use -f <address>`);
    process.exitCode = 1;
    return;
  }
  if (!opts.to || !validateAddress(opts.to)) {
    log.error(`Invalid or missing recipient address. Use -t <address>`);
    process.exitCode = 1;
    return;
  }
  if (!opts.amount || !validateAmount(opts.amount)) {
    log.error(`Invalid or missing amount. Use -a <amount>`);
    process.exitCode = 1;
    return;
  }

  log.title(`Transfer ${tokenName}`);
  log.label("From", opts.from);
  log.label("To", opts.to);
  log.label("Amount", `${opts.amount} ${tokenName}`);
  log.newline();

  const s = spinner(`Transferring ${opts.amount} ${tokenName}...`);
  try {
    const result = await circleWallets.createTransfer({
      walletAddress: opts.from,
      destinationAddress: opts.to,
      amount: opts.amount,
      tokenAddress,
    });

    s.succeed(`${tokenName} transfer initiated`);

    log.newline();
    if (result) {
      const data = result as unknown as Record<string, unknown>;
      table(
        ["Field", "Value"],
        [
          ["Transaction ID", String(data.id || "")],
          ["State", colorStatus(String(data.state || ""))],
          ["From", opts.from],
          ["To", opts.to],
          ["Amount", `${opts.amount} ${tokenName}`],
        ]
      );

      if (data.id) {
        log.newline();
        log.dim(`Check status: arc transfer status ${data.id}`);
      }
    }
  } catch (err) {
    s.fail("Transfer failed");
    log.error((err as Error).message);
    process.exitCode = 1;
  }
}

export function registerTransferCommand(program: Command): void {
  const transfer = program
    .command("transfer")
    .description("Transfer stablecoins on Arc (via Circle Developer-Controlled Wallets)")
    .addHelpText(
      "after",
      `
Requires Circle API credentials:
  arc config set api-key <your-key>
  arc config set entity-secret <your-secret>

This uses Circle's Developer-Controlled Wallets API.
For simple transfers with a local private key, use: arc send
`
    );

  transfer
    .command("usdc")
    .description("Transfer USDC via Circle Wallets")
    .option("-f, --from <address>", "Sender wallet address")
    .option("-t, --to <address>", "Recipient address")
    .option("-a, --amount <amount>", "Amount to transfer")
    .action((opts) => doTransfer("USDC", ARC_TESTNET.contracts.USDC.address, opts));

  transfer
    .command("eurc")
    .description("Transfer EURC via Circle Wallets")
    .option("-f, --from <address>", "Sender wallet address")
    .option("-t, --to <address>", "Recipient address")
    .option("-a, --amount <amount>", "Amount to transfer")
    .action((opts) => doTransfer("EURC", ARC_TESTNET.contracts.EURC.address, opts));

  transfer
    .command("status")
    .description("Check transfer status by Circle transaction ID")
    .argument("<txId>", "Circle transaction ID")
    .action(async (txId: string) => {
      const s = spinner("Fetching transfer status...");
      try {
        const result = await circleWallets.getTransaction(txId);
        s.succeed("Status fetched");

        if (result) {
          const data = result as unknown as Record<string, unknown>;
          const tx = (data.transaction || data) as Record<string, unknown>;
          log.newline();
          table(
            ["Field", "Value"],
            [
              ["Transaction ID", String(tx.id || data.id || "")],
              ["State", colorStatus(String(tx.state || data.state || ""))],
              ...(tx.txHash ? [["Tx Hash", String(tx.txHash)]] : []),
              ...(tx.sourceAddress ? [["From", String(tx.sourceAddress)]] : []),
              ...(tx.destinationAddress ? [["To", String(tx.destinationAddress)]] : []),
              ...(tx.createDate ? [["Created", String(tx.createDate)]] : []),
            ]
          );

          const txHash = tx.txHash || data.txHash;
          if (txHash) {
            log.newline();
            log.dim(`Explorer: ${ARC_TESTNET.explorer}/tx/${txHash}`);
          }
        }
      } catch (err) {
        s.fail("Failed to fetch status");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
