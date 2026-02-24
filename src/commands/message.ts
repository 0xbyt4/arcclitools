import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { getWalletClient, getPublicClient, arcTestnet, waitForReceipt, getTransaction } from "../services/rpc.js";
import { validateAddress } from "../utils/validator.js";
import { ARC_TESTNET } from "../config/constants.js";
import { toHex, fromHex } from "viem";

export function registerMessageCommand(program: Command): void {
  const message = program
    .command("message")
    .description("Write or read messages on Arc blockchain");

  message
    .command("write")
    .description("Write a message to the blockchain")
    .argument("<text>", "Message to write on-chain")
    .option("-t, --to <address>", "Recipient address (default: self)")
    .action(async (text: string, opts: { to?: string }) => {
      if (opts.to && !validateAddress(opts.to)) {
        log.error(`Invalid address: ${opts.to}`);
        process.exitCode = 1;
        return;
      }

      const wallet = getWalletClient();
      const account = wallet.account!;
      const to = (opts.to || account.address) as `0x${string}`;
      const data = toHex(text);

      log.title("On-chain Message");
      log.label("Message", text);
      log.label("Bytes", `${data.length / 2 - 1}`);
      log.label("To", to);
      log.newline();

      const s = spinner("Writing message to blockchain...");
      try {
        const hash = await wallet.sendTransaction({
          account,
          chain: arcTestnet,
          to,
          value: 0n,
          data: data as `0x${string}`,
        });

        s.text = "Waiting for confirmation...";
        const receipt = await waitForReceipt(hash);
        s.succeed("Message written to blockchain");

        log.newline();
        table(
          ["Field", "Value"],
          [
            ["From", account.address],
            ["To", to],
            ["Message", text],
            ["Tx Hash", hash],
            ["Block", receipt.blockNumber.toString()],
            ["Status", receipt.status === "success" ? "Confirmed" : "Failed"],
          ],
        );

        log.newline();
        log.dim(`Read: arc message read ${hash}`);
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/tx/${hash}`);
      } catch (err) {
        s.fail("Failed to write message");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  message
    .command("read")
    .description("Read a message from a transaction")
    .argument("<hash>", "Transaction hash")
    .action(async (hash: string) => {
      const s = spinner("Reading message from blockchain...");
      try {
        const tx = await getTransaction(hash as `0x${string}`);

        if (!tx.input || tx.input === "0x") {
          s.fail("No message found");
          log.warn("This transaction does not contain a message.");
          return;
        }

        const text = fromHex(tx.input as `0x${string}`, "string");
        s.succeed("Message found");

        log.newline();
        table(
          ["Field", "Value"],
          [
            ["From", tx.from],
            ["To", tx.to || "Contract creation"],
            ["Block", tx.blockNumber?.toString() || "Pending"],
            ["Message", text],
          ],
        );

        log.newline();
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/tx/${hash}`);
      } catch (err) {
        s.fail("Failed to read message");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
