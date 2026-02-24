import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { colorStatus } from "../utils/formatter.js";
import { promptAddress, promptAmount } from "../utils/prompts.js";
import { requireValidAddress, requireValidAmount } from "../utils/validator.js";
import * as circleWallets from "../services/circle-wallets.js";
import { ARC_TESTNET } from "../config/constants.js";

async function doTransfer(tokenName: string, tokenAddress: string, opts: { from?: string; to?: string; amount?: string }) {
  const from = opts.from || await promptAddress("Sender wallet address:");
  const to = opts.to || await promptAddress("Recipient address:");
  const amount = opts.amount || await promptAmount(`Amount of ${tokenName} to transfer:`);

  requireValidAddress(from, "sender");
  requireValidAddress(to, "recipient");
  requireValidAmount(amount);

  const s = spinner(`Transferring ${amount} ${tokenName}...`);
  try {
    const result = await circleWallets.createTransfer({
      walletAddress: from,
      destinationAddress: to,
      amount,
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
          ["From", from],
          ["To", to],
          ["Amount", `${amount} ${tokenName}`],
        ],
      );
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
    .description("Transfer stablecoins on Arc");

  transfer
    .command("usdc")
    .description("Transfer USDC")
    .option("-f, --from <address>", "Sender wallet address")
    .option("-t, --to <address>", "Recipient address")
    .option("-a, --amount <amount>", "Amount to transfer")
    .action((opts) => doTransfer("USDC", ARC_TESTNET.contracts.USDC.address, opts));

  transfer
    .command("eurc")
    .description("Transfer EURC")
    .option("-f, --from <address>", "Sender wallet address")
    .option("-t, --to <address>", "Recipient address")
    .option("-a, --amount <amount>", "Amount to transfer")
    .action((opts) => doTransfer("EURC", ARC_TESTNET.contracts.EURC.address, opts));

  transfer
    .command("status <txId>")
    .description("Check transfer status by Circle transaction ID")
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
            ],
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
