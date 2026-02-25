import { createRequire } from "module";
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
import { registerSendCommand } from "./commands/send.js";
import { registerMultisendCommand } from "./commands/multisend.js";
import { registerDeployCommand } from "./commands/deploy.js";
import { registerMessageCommand } from "./commands/message.js";
import { registerDexCommand } from "./commands/dex.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

export function createProgram(): Command {
  const program = new Command();

  program
    .name("arc")
    .description("CLI tool for Arc Network - Circle's EVM-compatible L1 with USDC as native gas")
    .version(pkg.version);

  registerConfigCommand(program);
  registerNetworkCommand(program);
  registerWalletCommand(program);
  registerSendCommand(program);
  registerMultisendCommand(program);
  registerDeployCommand(program);
  registerMessageCommand(program);
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
  registerDexCommand(program);

  return program;
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("index.ts")) {
  const program = createProgram();
  program.parse();
}
