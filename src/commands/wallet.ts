import { Command } from "commander";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { log, table, spinner } from "../utils/logger.js";
import { formatUSDC, formatToken, shortenAddress } from "../utils/formatter.js";
import { promptText } from "../utils/prompts.js";
import { validateAddress } from "../utils/validator.js";
import * as circleWallets from "../services/circle-wallets.js";
import { getBalance, readContract } from "../services/rpc.js";
import { ARC_TESTNET, NATIVE_USDC_DECIMALS } from "../config/constants.js";
import { castWalletNew, checkFoundryInstalled } from "../services/foundry.js";

function getWalletAddressFromEnv(): string | undefined {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return undefined;
  const match = readFileSync(envPath, "utf-8").match(/^WALLET_ADDRESS=(.+)$/m);
  return match?.[1]?.trim();
}

function backupAndWriteEnv(address: string, privateKey: string): { backedUp: boolean } {
  const envPath = resolve(process.cwd(), ".env");
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  let backedUp = false;

  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    const newLines: string[] = [];

    for (const line of lines) {
      if (/^PRIVATE_KEY=/.test(line)) {
        newLines.push(`# Backup (${timestamp})`);
        newLines.push(`# ${line}`);
        backedUp = true;
      } else if (/^WALLET_ADDRESS=/.test(line)) {
        newLines.push(`# ${line}`);
      } else {
        newLines.push(line);
      }
    }

    newLines.push(`PRIVATE_KEY=${privateKey}`);
    newLines.push(`WALLET_ADDRESS=${address}`);
    newLines.push("");

    writeFileSync(envPath, newLines.join("\n"));
  } else {
    writeFileSync(envPath, `PRIVATE_KEY=${privateKey}\nWALLET_ADDRESS=${address}\n`);
  }

  return { backedUp };
}

export function registerWalletCommand(program: Command): void {
  const wallet = program.command("wallet").description("Wallet management");

  wallet
    .command("create")
    .description("Create a Circle dev-controlled wallet on Arc Testnet")
    .option("-n, --name <name>", "Wallet set name", "Arc CLI Wallet Set")
    .option("-c, --count <count>", "Number of wallets to create", "1")
    .action(async (opts) => {
      const s = spinner("Creating wallet...");
      try {
        const walletSet = await circleWallets.createWalletSet(opts.name);
        if (!walletSet) throw new Error("Failed to create wallet set");

        const wallets = await circleWallets.createWallet(walletSet.id!, Number(opts.count));
        s.succeed("Wallet created");

        if (wallets && wallets.length > 0) {
          log.newline();
          table(
            ["ID", "Address", "Blockchain", "State"],
            wallets.map((w) => [
              String(w.id || ""),
              String(w.address || ""),
              String(w.blockchain || ""),
              String(w.state || ""),
            ])
          );
          log.newline();
          log.info(`Wallet Set ID: ${walletSet.id}`);
          log.dim(`Fund your wallet at: ${ARC_TESTNET.faucet}`);
        }
      } catch (err) {
        s.fail("Failed to create wallet");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  wallet
    .command("generate")
    .description("Generate a local EOA keypair and save to .env")
    .option("--no-save", "Do not save to .env file")
    .action((opts) => {
      if (!checkFoundryInstalled()) {
        log.error(
          "Foundry not installed. Install with: curl -L https://foundry.paradigm.xyz | bash"
        );
        process.exitCode = 1;
        return;
      }

      try {
        const output = castWalletNew();

        const addressMatch = output.match(/Address:\s+(0x[a-fA-F0-9]{40})/);
        const keyMatch = output.match(/Private key:\s+(0x[a-fA-F0-9]{64})/);

        if (!addressMatch || !keyMatch) {
          throw new Error("Failed to parse wallet output");
        }

        const address = addressMatch[1];
        const privateKey = keyMatch[1];

        log.title("New EOA Wallet");
        log.label("Address", address);
        log.label("Private Key", privateKey);

        if (opts.save) {
          const { backedUp } = backupAndWriteEnv(address, privateKey);
          log.newline();
          if (backedUp) {
            log.info("Previous wallet backed up in .env");
          }
          log.success("Saved to .env (PRIVATE_KEY, WALLET_ADDRESS)");
        }

        log.newline();
        log.warn("Save your private key securely. It will not be shown again.");
        log.dim(`Fund your wallet at: ${ARC_TESTNET.faucet}`);
      } catch (err) {
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  wallet
    .command("list")
    .description("List Circle dev-controlled wallets")
    .action(async () => {
      const s = spinner("Fetching wallets...");
      try {
        const wallets = await circleWallets.listWallets();
        s.succeed("Wallets fetched");

        if (!wallets || wallets.length === 0) {
          log.warn("No wallets found");
          return;
        }

        log.newline();
        table(
          ["ID", "Address", "Blockchain", "State"],
          wallets.map((w) => [
            String(w.id || ""),
            shortenAddress(String(w.address || "")),
            String(w.blockchain || ""),
            String(w.state || ""),
          ])
        );
      } catch (err) {
        s.fail("Failed to list wallets");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  wallet
    .command("balance")
    .description("Check wallet balance (USDC, EURC, USYC)")
    .argument("[address]", "Wallet address to check")
    .action(async (address?: string) => {
      if (!address) {
        address = getWalletAddressFromEnv();
        if (address) {
          log.dim(`Using wallet from .env: ${address}`);
        } else {
          address = await promptText("Enter wallet address:");
        }
      }

      if (!validateAddress(address)) {
        log.error(`Invalid address: ${address}`);
        process.exitCode = 1;
        return;
      }

      const s = spinner("Fetching balances...");
      try {
        const addr = address as `0x${string}`;
        const nativeBalance = await getBalance(addr);

        const erc20Abi = [
          {
            type: "function",
            name: "balanceOf",
            inputs: [{ type: "address" }],
            outputs: [{ type: "uint256" }],
            stateMutability: "view",
          },
        ] as const;

        const results = await Promise.allSettled([
          readContract({
            address: ARC_TESTNET.contracts.EURC.address as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addr],
          }),
          readContract({
            address: ARC_TESTNET.contracts.USYC.address as `0x${string}`,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [addr],
          }),
        ]);

        s.succeed("Balances fetched");

        const eurcBalance = results[0].status === "fulfilled" ? (results[0].value as bigint) : 0n;
        const usycBalance = results[1].status === "fulfilled" ? (results[1].value as bigint) : 0n;

        log.newline();
        log.label("Address", address);
        log.newline();
        table(
          ["Token", "Balance", "Decimals"],
          [
            ["USDC (native)", formatUSDC(nativeBalance, NATIVE_USDC_DECIMALS), "18"],
            ["EURC", formatToken(eurcBalance, 6, "EURC"), "6"],
            ["USYC", formatToken(usycBalance, 6, "USYC"), "6"],
          ]
        );
      } catch (err) {
        s.fail("Failed to fetch balances");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  wallet
    .command("fund")
    .description("Request testnet USDC/EURC via Circle Faucet API")
    .argument("[address]", "Wallet address to fund")
    .option("--usdc", "Request USDC tokens", true)
    .option("--eurc", "Request EURC tokens")
    .option("--no-usdc", "Skip USDC tokens")
    .option("--browser", "Open faucet in browser instead of API call")
    .action(async (address: string | undefined, opts) => {
      if (!address) {
        address = getWalletAddressFromEnv();
        if (address) {
          log.dim(`Using wallet from .env: ${address}`);
        } else {
          address = await promptText("Enter wallet address to fund:");
        }
      }

      if (!validateAddress(address)) {
        log.error(`Invalid address: ${address}`);
        process.exitCode = 1;
        return;
      }

      if (opts.browser) {
        log.info("Opening Circle Faucet in browser...");
        log.label("Your Address", address);
        const open = (await import("open")).default;
        await open(ARC_TESTNET.faucet);
        log.success("Faucet opened. Select 'Arc Testnet' and paste your address.");
        return;
      }

      const tokens: string[] = [];
      if (opts.usdc) tokens.push("USDC");
      if (opts.eurc) tokens.push("EURC");

      if (tokens.length === 0) {
        log.error("No tokens selected. Use --usdc and/or --eurc.");
        process.exitCode = 1;
        return;
      }

      const s = spinner(`Requesting ${tokens.join(" + ")} for ${address}...`);
      try {
        await circleWallets.requestTestnetTokens({
          address,
          usdc: opts.usdc,
          eurc: opts.eurc || false,
        });

        s.succeed(`Testnet tokens requested: ${tokens.join(", ")}`);
        log.newline();
        log.label("Address", address);
        log.label("Network", "Arc Testnet");
        log.label("Tokens", tokens.join(", "));
        log.newline();
        log.dim("Tokens should arrive within a few seconds.");
        log.dim("Check balance with: arc wallet balance " + address);
      } catch (err) {
        s.fail("Faucet request failed");
        const message = (err as Error).message;

        if (
          message.includes("API key") ||
          message.includes("api-key") ||
          message.includes("apiKey")
        ) {
          log.error("Circle API key required for programmatic faucet access.");
          log.dim("Set your API key: arc config set api-key <your-key>");
          log.dim("Or use --browser flag to open the faucet in browser.");
        } else {
          log.error(message);
          log.dim("Try --browser flag to use the web faucet instead.");
        }
        process.exitCode = 1;
      }
    });
}
