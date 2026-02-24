import { Command } from "commander";
import {
  ARC_TESTNET,
  ALTERNATIVE_RPCS,
  ALTERNATIVE_WS,
  MIN_BASE_FEE_GWEI,
} from "../config/constants.js";
import { getRpcUrl } from "../config/env.js";
import { getBlockNumber, getBaseFee, formatGasPriceDisplay } from "../services/rpc.js";
import { log, table, spinner } from "../utils/logger.js";
import { formatBlockNumber } from "../utils/formatter.js";

export function registerNetworkCommand(program: Command): void {
  const network = program.command("network").description("Arc network information and status");

  network
    .command("info")
    .description("Show Arc network details")
    .action(() => {
      log.title("Arc Network Info");

      table(
        ["Property", "Value"],
        [
          ["Network", ARC_TESTNET.name],
          ["Chain ID", String(ARC_TESTNET.chainId)],
          ["Currency", "USDC (native gas token)"],
          ["RPC URL", ARC_TESTNET.rpcUrl],
          ["WebSocket", ARC_TESTNET.wsUrl],
          ["Explorer", ARC_TESTNET.explorer],
          ["Faucet", ARC_TESTNET.faucet],
          ["CCTP Domain", String(ARC_TESTNET.cctpDomain)],
          ["Min Base Fee", `${MIN_BASE_FEE_GWEI} Gwei`],
          ["EVM Target", "Prague hard fork"],
          ["Consensus", "Malachite (Tendermint-based BFT)"],
          ["Finality", "Deterministic, instant (<1s)"],
        ]
      );

      log.newline();
      log.title("Alternative RPC Endpoints");
      for (const rpc of ALTERNATIVE_RPCS) {
        console.log(`  ${rpc}`);
      }

      log.newline();
      log.title("Alternative WebSocket Endpoints");
      for (const ws of ALTERNATIVE_WS) {
        console.log(`  ${ws}`);
      }
    });

  network
    .command("status")
    .description("Check RPC connection and block height")
    .action(async () => {
      const s = spinner("Connecting to Arc network...");
      try {
        const rpcUrl = getRpcUrl();
        const blockNumber = await getBlockNumber();
        s.succeed("Connected to Arc network");

        log.newline();
        table(
          ["Property", "Value"],
          [
            ["RPC URL", rpcUrl],
            ["Block Height", formatBlockNumber(blockNumber)],
            ["Status", "Connected"],
          ]
        );
      } catch (err) {
        s.fail("Failed to connect to Arc network");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  network
    .command("gas")
    .description("Show current gas price")
    .action(async () => {
      const s = spinner("Fetching gas price...");
      try {
        const { baseFee, blockNumber } = await getBaseFee();
        const { gwei, estimatedTxCost } = formatGasPriceDisplay(baseFee);
        s.succeed("Gas price fetched");

        log.newline();
        table(
          ["Property", "Value"],
          [
            ["Base Fee", `${gwei} Gwei`],
            ["Min Base Fee", `${MIN_BASE_FEE_GWEI} Gwei`],
            ["Est. Transfer Cost (21k gas)", estimatedTxCost],
            ["Block", formatBlockNumber(blockNumber)],
          ]
        );

        log.newline();
        log.dim("Gas tracker: https://testnet.arcscan.app/gas-tracker");
      } catch (err) {
        s.fail("Failed to fetch gas price");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
