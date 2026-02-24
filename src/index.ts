import { Command } from "commander";
import { registerConfigCommand } from "./commands/config.js";
import { registerNetworkCommand } from "./commands/network.js";
import { registerWalletCommand } from "./commands/wallet.js";
import { registerTransferCommand } from "./commands/transfer.js";
import { registerBridgeCommand } from "./commands/bridge.js";
import { registerGatewayCommand } from "./commands/gateway.js";
import { registerContractCommand } from "./commands/contract.js";
import { registerTxCommand } from "./commands/tx.js";
import { registerX402Command } from "./commands/x402.js";
import { registerExploreCommand } from "./commands/explore.js";
import { registerAddressesCommand } from "./commands/addresses.js";
import { registerInfoCommand } from "./commands/info.js";
import { registerDocsCommand } from "./commands/docs.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("arc")
    .description("CLI tool for Arc Network - Circle's EVM-compatible L1 with USDC as native gas")
    .version("0.1.0");

  registerConfigCommand(program);
  registerNetworkCommand(program);
  registerWalletCommand(program);
  registerTransferCommand(program);
  registerBridgeCommand(program);
  registerGatewayCommand(program);
  registerContractCommand(program);
  registerTxCommand(program);
  registerX402Command(program);
  registerExploreCommand(program);
  registerAddressesCommand(program);
  registerInfoCommand(program);
  registerDocsCommand(program);

  return program;
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("index.ts")) {
  const program = createProgram();
  program.parse();
}
