import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { formatUSDC, colorStatus, shortenAddress } from "../utils/formatter.js";
import { requireValidTxHash } from "../utils/validator.js";
import { getTransaction, getTransactionReceipt, formatGasToUSDC } from "../services/rpc.js";
import { ARC_TESTNET, NATIVE_USDC_DECIMALS } from "../config/constants.js";
import { formatGwei } from "viem";

export function registerTxCommand(program: Command): void {
  const tx = program.command("tx").description("Transaction operations");

  tx.command("status <hash>")
    .description("Check transaction status and details")
    .action(async (hash: string) => {
      requireValidTxHash(hash);

      const s = spinner("Fetching transaction...");
      try {
        const txData = await getTransaction(hash as `0x${string}`);
        let receipt;
        try {
          receipt = await getTransactionReceipt(hash as `0x${string}`);
        } catch {
          // Transaction may be pending
        }

        s.succeed("Transaction fetched");

        const status = receipt
          ? receipt.status === "success"
            ? "success"
            : "reverted"
          : "pending";

        log.newline();
        table(
          ["Field", "Value"],
          [
            ["Hash", hash],
            ["Status", colorStatus(status)],
            ["From", txData.from],
            ["To", txData.to || "(contract creation)"],
            ["Value", formatUSDC(txData.value, NATIVE_USDC_DECIMALS)],
            ["Gas Price", txData.gasPrice ? `${formatGwei(txData.gasPrice)} Gwei` : "N/A"],
            ...(receipt
              ? [
                  ["Gas Used", String(receipt.gasUsed)],
                  ["Tx Fee", `${formatGasToUSDC(receipt.gasUsed, receipt.effectiveGasPrice)} USDC`],
                  ["Block", String(receipt.blockNumber)],
                ]
              : []),
            ...(txData.input && txData.input !== "0x" ? [["Has Input Data", "Yes"]] : []),
          ]
        );

        log.newline();
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/tx/${hash}`);
      } catch (err) {
        s.fail("Failed to fetch transaction");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  tx.command("decode <hash>")
    .description("Decode transaction input data")
    .action(async (hash: string) => {
      requireValidTxHash(hash);

      const s = spinner("Fetching and decoding transaction...");
      try {
        const txData = await getTransaction(hash as `0x${string}`);

        if (!txData.input || txData.input === "0x") {
          s.warn("Transaction has no input data (simple transfer)");
          return;
        }

        s.succeed("Transaction fetched");

        log.newline();
        table(
          ["Field", "Value"],
          [
            ["Hash", hash],
            ["From", txData.from],
            ["To", txData.to || "(contract creation)"],
            [
              "Input Data (hex)",
              txData.input.slice(0, 74) + (txData.input.length > 74 ? "..." : ""),
            ],
            ["Function Selector", txData.input.slice(0, 10)],
          ]
        );

        log.newline();
        log.dim("Full input data decoding requires contract ABI.");
        log.dim("Use 'cast 4byte-decode' with Foundry for detailed decoding.");
      } catch (err) {
        s.fail("Failed to decode transaction");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  tx.command("receipt <hash>")
    .description("Get transaction receipt")
    .action(async (hash: string) => {
      requireValidTxHash(hash);

      const s = spinner("Fetching receipt...");
      try {
        const receipt = await getTransactionReceipt(hash as `0x${string}`);
        s.succeed("Receipt fetched");

        const status = receipt.status === "success" ? "success" : "reverted";

        log.newline();
        table(
          ["Field", "Value"],
          [
            ["Hash", hash],
            ["Status", colorStatus(status)],
            ["Block Number", String(receipt.blockNumber)],
            ["From", receipt.from],
            ["To", receipt.to || "(contract creation)"],
            ["Gas Used", String(receipt.gasUsed)],
            ["Effective Gas Price", `${formatGwei(receipt.effectiveGasPrice)} Gwei`],
            ["Tx Fee", `${formatGasToUSDC(receipt.gasUsed, receipt.effectiveGasPrice)} USDC`],
            ["Logs Count", String(receipt.logs.length)],
            ...(receipt.contractAddress ? [["Contract Created", receipt.contractAddress]] : []),
          ]
        );

        if (receipt.logs.length > 0) {
          log.newline();
          log.title("Event Logs");
          for (const [i, eventLog] of receipt.logs.entries()) {
            console.log(
              `  Log #${i}: address=${shortenAddress(eventLog.address)} topics=${eventLog.topics.length}`
            );
          }
        }

        log.newline();
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/tx/${hash}`);
      } catch (err) {
        s.fail("Failed to fetch receipt");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
