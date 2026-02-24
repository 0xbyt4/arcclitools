import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { promptAddress, promptAmount, promptSelect } from "../utils/prompts.js";
import { requireValidAddress, requireValidAmount } from "../utils/validator.js";
import { bridgeToArc, bridgeFromArc, getSupportedChains, type BridgeChain } from "../services/bridge.js";
import { ARC_TESTNET } from "../config/constants.js";

const chainChoices = getSupportedChains()
  .filter((c) => c !== "Arc_Testnet")
  .map((c) => ({ name: c.replace(/_/g, " "), value: c }));

export function registerBridgeCommand(program: Command): void {
  const bridge = program
    .command("bridge")
    .description("Bridge USDC to/from Arc via CCTP");

  bridge
    .command("to-arc")
    .description("Bridge USDC from another chain to Arc Testnet")
    .option("-c, --chain <chain>", "Source chain")
    .option("-f, --from <address>", "Source wallet address")
    .option("-t, --to <address>", "Destination address on Arc")
    .option("-a, --amount <amount>", "Amount of USDC to bridge")
    .action(async (opts) => {
      const sourceChain = (opts.chain || await promptSelect("Source chain:", chainChoices)) as BridgeChain;
      const from = opts.from || await promptAddress("Source wallet address:");
      const to = opts.to || await promptAddress("Destination address on Arc:");
      const amount = opts.amount || await promptAmount("Amount of USDC to bridge:");

      requireValidAddress(from, "source");
      requireValidAddress(to, "destination");
      requireValidAmount(amount);

      const s = spinner(`Bridging ${amount} USDC from ${sourceChain} to Arc...`);
      try {
        const result = await bridgeToArc({
          sourceChain,
          sourceAddress: from,
          destinationAddress: to,
          amount,
        });

        s.succeed("Bridge initiated");
        log.newline();

        log.newline();
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        s.fail("Bridge failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  bridge
    .command("from-arc")
    .description("Bridge USDC from Arc to another chain")
    .option("-c, --chain <chain>", "Destination chain")
    .option("-f, --from <address>", "Source wallet address on Arc")
    .option("-t, --to <address>", "Destination address")
    .option("-a, --amount <amount>", "Amount of USDC to bridge")
    .action(async (opts) => {
      const destinationChain = (opts.chain || await promptSelect("Destination chain:", chainChoices)) as BridgeChain;
      const from = opts.from || await promptAddress("Source wallet address on Arc:");
      const to = opts.to || await promptAddress("Destination address:");
      const amount = opts.amount || await promptAmount("Amount of USDC to bridge:");

      requireValidAddress(from, "source");
      requireValidAddress(to, "destination");
      requireValidAmount(amount);

      const s = spinner(`Bridging ${amount} USDC from Arc to ${destinationChain}...`);
      try {
        const result = await bridgeFromArc({
          destinationChain,
          sourceAddress: from,
          destinationAddress: to,
          amount,
        });

        s.succeed("Bridge initiated");
        log.newline();
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        s.fail("Bridge failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  bridge
    .command("status <txHash>")
    .description("Check bridge transaction status")
    .action(async (txHash: string) => {
      log.info("Check bridge status on the explorer:");
      log.newline();
      console.log(`  ${ARC_TESTNET.explorer}/tx/${txHash}`);
      log.newline();
      log.dim("Bridge transactions go through 4 steps: Approve, Burn, Fetch Attestation, Mint");
    });
}
