import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { validateAddress, validateAmount } from "../utils/validator.js";
import {
  bridgeToArc,
  bridgeFromArc,
  getSupportedChains,
  type BridgeChain,
} from "../services/bridge.js";
import { ARC_TESTNET } from "../config/constants.js";

const SUPPORTED = getSupportedChains().filter((c) => c !== "Arc_Testnet");

export function registerBridgeCommand(program: Command): void {
  const bridge = program
    .command("bridge")
    .description("Bridge USDC to/from Arc via CCTP")
    .addHelpText(
      "after",
      `
Requires Circle API credentials:
  arc config set api-key <your-key>
  arc config set entity-secret <your-secret>

Supported chains: ${SUPPORTED.map((c) => c.replace(/_/g, " ")).join(", ")}
`
    );

  bridge
    .command("to-arc")
    .description("Bridge USDC from another chain to Arc Testnet")
    .option("-c, --chain <chain>", `Source chain (${SUPPORTED.join(", ")})`)
    .option("-f, --from <address>", "Source wallet address")
    .option("-t, --to <address>", "Destination address on Arc")
    .option("-a, --amount <amount>", "Amount of USDC to bridge")
    .addHelpText(
      "after",
      `
Examples:
  $ arc bridge to-arc -c Ethereum_Sepolia -f 0xSrc... -t 0xDst... -a 10
  $ arc bridge to-arc -c Base_Sepolia -f 0xSrc... -t 0xDst... -a 100
`
    )
    .action(async (opts: { chain?: string; from?: string; to?: string; amount?: string }) => {
      if (!opts.chain || !SUPPORTED.includes(opts.chain as BridgeChain)) {
        log.error(`Invalid or missing chain. Use -c <chain>`);
        log.dim(`Supported: ${SUPPORTED.join(", ")}`);
        process.exitCode = 1;
        return;
      }
      if (!opts.from || !validateAddress(opts.from)) {
        log.error("Invalid or missing source address. Use -f <address>");
        process.exitCode = 1;
        return;
      }
      if (!opts.to || !validateAddress(opts.to)) {
        log.error("Invalid or missing destination address. Use -t <address>");
        process.exitCode = 1;
        return;
      }
      if (!opts.amount || !validateAmount(opts.amount)) {
        log.error("Invalid or missing amount. Use -a <amount>");
        process.exitCode = 1;
        return;
      }

      log.title("Bridge to Arc");
      log.label("Source", `${opts.chain.replace(/_/g, " ")}`);
      log.label("From", opts.from);
      log.label("To", opts.to);
      log.label("Amount", `${opts.amount} USDC`);
      log.newline();

      const s = spinner(`Bridging ${opts.amount} USDC from ${opts.chain} to Arc...`);
      try {
        const result = await bridgeToArc({
          sourceChain: opts.chain as BridgeChain,
          sourceAddress: opts.from,
          destinationAddress: opts.to,
          amount: opts.amount,
        });

        s.succeed("Bridge initiated");
        log.newline();

        if (result) {
          const data = result as unknown as Record<string, unknown>;
          table(
            ["Field", "Value"],
            [
              ["Source Chain", opts.chain.replace(/_/g, " ")],
              ["From", opts.from],
              ["To (Arc)", opts.to],
              ["Amount", `${opts.amount} USDC`],
              ...(data.txHash ? [["Tx Hash", String(data.txHash)]] : []),
              ...(data.status ? [["Status", String(data.status)]] : []),
            ]
          );
        }

        log.newline();
        log.dim("Bridge transactions go through: Approve -> Burn -> Attestation -> Mint");
        log.dim("This may take several minutes to complete.");
      } catch (err) {
        s.fail("Bridge failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  bridge
    .command("from-arc")
    .description("Bridge USDC from Arc to another chain")
    .option("-c, --chain <chain>", `Destination chain (${SUPPORTED.join(", ")})`)
    .option("-f, --from <address>", "Source wallet address on Arc")
    .option("-t, --to <address>", "Destination address")
    .option("-a, --amount <amount>", "Amount of USDC to bridge")
    .addHelpText(
      "after",
      `
Examples:
  $ arc bridge from-arc -c Ethereum_Sepolia -f 0xSrc... -t 0xDst... -a 10
  $ arc bridge from-arc -c Base_Sepolia -f 0xSrc... -t 0xDst... -a 50
`
    )
    .action(async (opts: { chain?: string; from?: string; to?: string; amount?: string }) => {
      if (!opts.chain || !SUPPORTED.includes(opts.chain as BridgeChain)) {
        log.error(`Invalid or missing chain. Use -c <chain>`);
        log.dim(`Supported: ${SUPPORTED.join(", ")}`);
        process.exitCode = 1;
        return;
      }
      if (!opts.from || !validateAddress(opts.from)) {
        log.error("Invalid or missing source address. Use -f <address>");
        process.exitCode = 1;
        return;
      }
      if (!opts.to || !validateAddress(opts.to)) {
        log.error("Invalid or missing destination address. Use -t <address>");
        process.exitCode = 1;
        return;
      }
      if (!opts.amount || !validateAmount(opts.amount)) {
        log.error("Invalid or missing amount. Use -a <amount>");
        process.exitCode = 1;
        return;
      }

      log.title("Bridge from Arc");
      log.label("Destination", `${opts.chain.replace(/_/g, " ")}`);
      log.label("From (Arc)", opts.from);
      log.label("To", opts.to);
      log.label("Amount", `${opts.amount} USDC`);
      log.newline();

      const s = spinner(`Bridging ${opts.amount} USDC from Arc to ${opts.chain}...`);
      try {
        const result = await bridgeFromArc({
          destinationChain: opts.chain as BridgeChain,
          sourceAddress: opts.from,
          destinationAddress: opts.to,
          amount: opts.amount,
        });

        s.succeed("Bridge initiated");
        log.newline();

        if (result) {
          const data = result as unknown as Record<string, unknown>;
          table(
            ["Field", "Value"],
            [
              ["From (Arc)", opts.from],
              ["Destination", opts.chain.replace(/_/g, " ")],
              ["To", opts.to],
              ["Amount", `${opts.amount} USDC`],
              ...(data.txHash ? [["Tx Hash", String(data.txHash)]] : []),
              ...(data.status ? [["Status", String(data.status)]] : []),
            ]
          );
        }

        log.newline();
        log.dim("Bridge transactions go through: Approve -> Burn -> Attestation -> Mint");
        log.dim("This may take several minutes to complete.");
      } catch (err) {
        s.fail("Bridge failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  bridge
    .command("status")
    .description("Check bridge transaction status")
    .argument("<txHash>", "Transaction hash")
    .action(async (txHash: string) => {
      log.title("Bridge Status");
      log.newline();
      log.info("Check bridge status on the explorer:");
      log.newline();
      log.label("URL", `${ARC_TESTNET.explorer}/tx/${txHash}`);
      log.newline();
      log.dim("Bridge steps: Approve -> Burn -> Fetch Attestation -> Mint");
      log.dim("Typically takes 10-30 minutes to complete.");
    });
}
