import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { promptText, promptSelect, promptAddress } from "../utils/prompts.js";
import { requireValidAddress } from "../utils/validator.js";
import * as circleContracts from "../services/circle-contracts.js";
import * as foundry from "../services/foundry.js";
import { ARC_TESTNET } from "../config/constants.js";

export function registerContractCommand(program: Command): void {
  const contract = program
    .command("contract")
    .description("Smart contract deployment and interaction");

  contract
    .command("deploy")
    .description("Deploy a smart contract on Arc Testnet")
    .option("--foundry", "Deploy using Foundry (forge create)")
    .option("--template <type>", "Deploy Circle template (erc20, erc721, erc1155, airdrop)")
    .option("-c, --contract <path>", "Contract path (for Foundry: src/Contract.sol:Contract)")
    .option("-w, --wallet-id <id>", "Circle wallet ID (for template deploy)")
    .option("-n, --name <name>", "Contract/token name")
    .option("-s, --symbol <symbol>", "Token symbol")
    .option("--args <args...>", "Constructor arguments (for Foundry)")
    .action(async (opts) => {
      if (opts.foundry) {
        if (!foundry.checkFoundryInstalled()) {
          log.error("Foundry not installed. Install with: curl -L https://foundry.paradigm.xyz | bash");
          process.exitCode = 1;
          return;
        }

        const contractPath = opts.contract || await promptText("Contract path (e.g., src/MyContract.sol:MyContract):");
        const s = spinner("Deploying with Foundry...");
        try {
          const output = foundry.deployWithFoundry({
            contractPath,
            constructorArgs: opts.args,
          });
          s.succeed("Contract deployed");
          log.newline();
          console.log(output);
        } catch (err) {
          s.fail("Deployment failed");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
        return;
      }

      if (opts.template) {
        const walletId = opts.walletId || await promptText("Circle wallet ID:");
        const name = opts.name || await promptText("Contract name:");
        const symbol = opts.symbol;

        const validTemplates = ["erc20", "erc721", "erc1155", "airdrop"];
        if (!validTemplates.includes(opts.template)) {
          log.error(`Invalid template. Choose from: ${validTemplates.join(", ")}`);
          process.exitCode = 1;
          return;
        }

        const s = spinner(`Deploying ${opts.template} template...`);
        try {
          const result = await circleContracts.deployTemplate({
            walletId,
            template: opts.template as "erc20" | "erc721" | "erc1155" | "airdrop",
            name,
            symbol,
          });
          s.succeed("Deployment initiated");

          if (result) {
            log.newline();
            console.log(JSON.stringify(result, null, 2));
          }
        } catch (err) {
          s.fail("Deployment failed");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
        return;
      }

      const method = await promptSelect("Deployment method:", [
        { name: "Foundry (forge create)", value: "foundry", description: "Deploy using local Foundry toolchain" },
        { name: "Circle Template", value: "template", description: "Deploy pre-audited Circle template" },
      ]);

      if (method === "foundry") {
        if (!foundry.checkFoundryInstalled()) {
          log.error("Foundry not installed. Install with: curl -L https://foundry.paradigm.xyz | bash");
          process.exitCode = 1;
          return;
        }
        const contractPath = await promptText("Contract path (e.g., src/MyContract.sol:MyContract):");
        const s = spinner("Deploying with Foundry...");
        try {
          const output = foundry.deployWithFoundry({ contractPath });
          s.succeed("Contract deployed");
          log.newline();
          console.log(output);
        } catch (err) {
          s.fail("Deployment failed");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
      } else {
        const template = await promptSelect("Template:", [
          { name: "ERC-20", value: "erc20", description: "Fungible token" },
          { name: "ERC-721", value: "erc721", description: "NFT" },
          { name: "ERC-1155", value: "erc1155", description: "Multi-token" },
          { name: "Airdrop", value: "airdrop", description: "Token distribution" },
        ]) as "erc20" | "erc721" | "erc1155" | "airdrop";

        const walletId = await promptText("Circle wallet ID:");
        const name = await promptText("Contract name:");
        const symbol = ["erc20", "erc721"].includes(template) ? await promptText("Token symbol:") : undefined;

        const s = spinner(`Deploying ${template} template...`);
        try {
          const result = await circleContracts.deployTemplate({ walletId, template, name, symbol });
          s.succeed("Deployment initiated");
          if (result) {
            log.newline();
            console.log(JSON.stringify(result, null, 2));
          }
        } catch (err) {
          s.fail("Deployment failed");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
      }
    });

  contract
    .command("interact")
    .description("Call a contract function")
    .option("-a, --address <address>", "Contract address")
    .option("-f, --function <sig>", "Function signature (e.g., 'balanceOf(address)')")
    .option("--args <args...>", "Function arguments")
    .option("--write", "Send a transaction (write operation)")
    .option("-w, --wallet-id <id>", "Circle wallet ID (for write operations)")
    .action(async (opts) => {
      const address = opts.address || await promptAddress("Contract address:");
      const functionSig = opts.function || await promptText("Function signature (e.g., balanceOf(address)):");

      requireValidAddress(address, "contract");

      if (opts.write) {
        const walletId = opts.walletId || await promptText("Circle wallet ID:");
        const s = spinner("Executing transaction...");
        try {
          const result = await circleContracts.getContract(walletId);
          log.newline();
          console.log(JSON.stringify(result, null, 2));
          s.succeed("Transaction executed");
        } catch (err) {
          s.fail("Transaction failed");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
      } else {
        const s = spinner("Calling contract...");
        try {
          const output = foundry.castCall({
            contractAddress: address,
            functionSignature: functionSig,
            args: opts.args,
          });
          s.succeed("Call completed");
          log.newline();
          console.log(output);
        } catch (err) {
          s.fail("Call failed");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
      }
    });

  contract
    .command("verify")
    .description("Verify a contract on Blockscout")
    .option("-a, --address <address>", "Contract address")
    .option("-c, --contract <path>", "Contract path")
    .option("--args <args...>", "Constructor arguments")
    .action(async (opts) => {
      if (!foundry.checkFoundryInstalled()) {
        log.error("Foundry required for verification. Install with: curl -L https://foundry.paradigm.xyz | bash");
        process.exitCode = 1;
        return;
      }

      const address = opts.address || await promptAddress("Contract address:");
      const contractPath = opts.contract || await promptText("Contract path (e.g., src/MyContract.sol:MyContract):");

      requireValidAddress(address, "contract");

      const s = spinner("Verifying contract...");
      try {
        const output = foundry.verifyContract({
          address,
          contractPath,
          constructorArgs: opts.args,
        });
        s.succeed("Contract verified");
        log.newline();
        console.log(output);
        log.newline();
        log.dim(`View on explorer: ${ARC_TESTNET.explorer}/address/${address}`);
      } catch (err) {
        s.fail("Verification failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  contract
    .command("import")
    .description("Import an existing contract to Circle platform")
    .option("-a, --address <address>", "Contract address")
    .option("-n, --name <name>", "Contract name")
    .action(async (opts) => {
      const address = opts.address || await promptAddress("Contract address:");
      const name = opts.name || await promptText("Contract name:");

      requireValidAddress(address, "contract");

      const s = spinner("Importing contract...");
      try {
        const result = await circleContracts.importContract({ address, name });
        s.succeed("Contract imported");
        log.newline();
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        s.fail("Import failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  const events = contract
    .command("events")
    .description("Contract event monitoring");

  events
    .command("monitor")
    .description("Create an event monitor (webhook)")
    .option("-a, --address <address>", "Contract address")
    .option("-e, --event <signature>", "Event signature (e.g., Transfer(address,address,uint256))")
    .action(async (opts) => {
      const address = opts.address || await promptAddress("Contract address:");
      const eventSig = opts.event || await promptText("Event signature (e.g., Transfer(address,address,uint256)):");

      requireValidAddress(address, "contract");

      const s = spinner("Creating event monitor...");
      try {
        const result = await circleContracts.createEventMonitor({
          contractAddress: address,
          eventSignature: eventSig,
        });
        s.succeed("Event monitor created");
        log.newline();
        console.log(JSON.stringify(result, null, 2));
        log.newline();
        log.dim("Events will be sent to your registered webhook endpoint.");
        log.dim("Register webhooks at: https://console.circle.com -> Webhooks");
      } catch (err) {
        s.fail("Failed to create monitor");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  events
    .command("logs")
    .description("Query event logs for a contract")
    .option("-a, --address <address>", "Contract address")
    .option("-l, --limit <number>", "Number of logs to fetch", "20")
    .action(async (opts) => {
      const address = opts.address || await promptAddress("Contract address:");

      requireValidAddress(address, "contract");

      const s = spinner("Fetching event logs...");
      try {
        const result = await circleContracts.listEventLogs({
          contractAddress: address,
          pageSize: Number(opts.limit),
        });
        s.succeed("Event logs fetched");
        log.newline();
        console.log(JSON.stringify(result, null, 2));
      } catch (err) {
        s.fail("Failed to fetch logs");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
