import { Command } from "commander";
import { log, table } from "../utils/logger.js";
import { ARC_TESTNET } from "../config/constants.js";

export function registerAddressesCommand(program: Command): void {
  const addresses = program
    .command("addresses")
    .description("Known contract addresses on Arc Testnet");

  addresses
    .command("list")
    .description("List all known contract addresses")
    .option("-c, --category <cat>", "Filter by category (stablecoins, cctp, gateway, payments, common)")
    .action((opts) => {
      const contracts = ARC_TESTNET.contracts;

      const categories: Record<string, string[]> = {
        stablecoins: ["USDC", "EURC", "USYC", "USYCEntitlements", "USYCTeller"],
        cctp: ["TokenMessengerV2", "MessageTransmitterV2", "TokenMinterV2", "MessageV2"],
        gateway: ["GatewayWallet", "GatewayMinter"],
        payments: ["FxEscrow"],
        common: ["Multicall3", "Permit2", "CREATE2Factory"],
      };

      if (opts.category) {
        const catKeys = categories[opts.category];
        if (!catKeys) {
          log.error(`Unknown category: ${opts.category}`);
          log.dim(`Available: ${Object.keys(categories).join(", ")}`);
          process.exitCode = 1;
          return;
        }

        log.title(`${opts.category.charAt(0).toUpperCase() + opts.category.slice(1)} Contracts`);
        table(
          ["Name", "Address", "Description"],
          catKeys
            .filter((k) => contracts[k])
            .map((k) => [k, contracts[k].address, contracts[k].description]),
        );
        return;
      }

      for (const [catName, catKeys] of Object.entries(categories)) {
        log.title(`${catName.charAt(0).toUpperCase() + catName.slice(1)}`);
        table(
          ["Name", "Address", "Description"],
          catKeys
            .filter((k) => contracts[k])
            .map((k) => [k, contracts[k].address, contracts[k].description]),
        );
        log.newline();
      }

      log.dim(`Network: ${ARC_TESTNET.name} (Chain ID: ${ARC_TESTNET.chainId})`);
      log.dim(`Explorer: ${ARC_TESTNET.explorer}`);
    });
}
