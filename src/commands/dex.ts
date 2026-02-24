import { Command } from "commander";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { log, table, spinner } from "../utils/logger.js";
import {
  callContract,
  callContractWithValue,
  approveERC20,
  waitForReceipt,
  getTokenInfo,
  readContract,
  getWalletClient,
} from "../services/rpc.js";
import { loadDeployments } from "../services/deployments.js";
import { validateAddress, validateAmount } from "../utils/validator.js";
import { ARC_TESTNET, NATIVE_USDC_DECIMALS } from "../config/constants.js";
import { parseUnits, formatUnits, type Abi } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDEXAbi(): Abi {
  const artifactPath = resolve(__dirname, "../contracts/SimpleDEX.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  return artifact.abi;
}

function resolveDexAddress(opts: { dex?: string }): `0x${string}` | null {
  // 1. Explicit --dex flag
  if (opts.dex) {
    if (!validateAddress(opts.dex)) {
      log.error(`Invalid DEX address: ${opts.dex}`);
      return null;
    }
    return opts.dex as `0x${string}`;
  }

  // 2. Find latest DEX from deployments.json
  const deployments = loadDeployments();
  const dexDeployment = deployments.filter((d) => d.name === "SimpleDEX").pop();
  if (dexDeployment) {
    return dexDeployment.address as `0x${string}`;
  }

  log.error("DEX address not found.");
  log.dim("Deploy one with: arc deploy dex");
  log.dim("Or specify with: --dex <address>");
  return null;
}

function isUSDC(value: string): boolean {
  return value.toLowerCase() === "usdc";
}

export function registerDexCommand(program: Command): void {
  const dex = program
    .command("dex")
    .description("Interact with SimpleDEX (AMM) - swap, add/remove liquidity");

  dex
    .command("create-pool")
    .description("Create a new USDC/Token liquidity pool")
    .argument("<token>", "ERC-20 token address")
    .option("--dex <address>", "DEX contract address (auto-detected from deployments.json)")
    .action(async (token: string, opts: { dex?: string }) => {
      if (!validateAddress(token)) {
        log.error(`Invalid token address: ${token}`);
        process.exitCode = 1;
        return;
      }

      const dexAddress = resolveDexAddress(opts);
      if (!dexAddress) {
        process.exitCode = 1;
        return;
      }

      const abi = loadDEXAbi();

      const s = spinner("Fetching token info...");
      try {
        const tokenInfo = await getTokenInfo(token as `0x${string}`);

        log.title("Create Pool");
        log.label("DEX", dexAddress);
        log.label("Token", `${tokenInfo.symbol} (${token})`);
        log.label("Pair", `USDC / ${tokenInfo.symbol}`);
        log.newline();

        s.text = "Creating pool...";
        const hash = await callContract({
          address: dexAddress,
          abi,
          functionName: "createPool",
          args: [token as `0x${string}`],
        });
        await waitForReceipt(hash);

        s.succeed("Pool created");
        log.dim(`Tx: ${hash}`);
        log.newline();
        log.dim(`Add liquidity: arc dex add-liquidity ${token} <usdc-amount> <token-amount>`);
      } catch (err) {
        s.fail("Failed to create pool");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  dex
    .command("add-liquidity")
    .description("Add liquidity to a USDC/Token pool")
    .argument("<token>", "ERC-20 token address")
    .argument("<usdc-amount>", "Amount of USDC to add")
    .argument("<token-amount>", "Amount of tokens to add")
    .option("--dex <address>", "DEX contract address")
    .addHelpText(
      "after",
      `
Examples:
  $ arc dex add-liquidity 0xToken... 100 50000
  $ arc dex add-liquidity 0xToken... 10 1000 --dex 0xDEX...

Adds USDC (native) and ERC-20 tokens to the pool.
Token approval is handled automatically.
`
    )
    .action(
      async (token: string, usdcAmount: string, tokenAmount: string, opts: { dex?: string }) => {
        if (!validateAddress(token)) {
          log.error(`Invalid token: ${token}`);
          process.exitCode = 1;
          return;
        }
        if (!validateAmount(usdcAmount)) {
          log.error(`Invalid USDC amount: ${usdcAmount}`);
          process.exitCode = 1;
          return;
        }
        if (!validateAmount(tokenAmount)) {
          log.error(`Invalid token amount: ${tokenAmount}`);
          process.exitCode = 1;
          return;
        }

        const dexAddress = resolveDexAddress(opts);
        if (!dexAddress) {
          process.exitCode = 1;
          return;
        }

        const abi = loadDEXAbi();

        const s = spinner("Fetching token info...");
        try {
          const tokenInfo = await getTokenInfo(token as `0x${string}`);
          const usdcWei = parseUnits(usdcAmount, NATIVE_USDC_DECIMALS);
          const tokenWei = parseUnits(tokenAmount, tokenInfo.decimals);

          log.title("Add Liquidity");
          log.label("Pool", `USDC / ${tokenInfo.symbol}`);
          log.label("USDC", `${usdcAmount} USDC`);
          log.label("Token", `${tokenAmount} ${tokenInfo.symbol}`);
          log.newline();

          // Approve token spending
          s.text = `Approving ${tokenInfo.symbol} for DEX...`;
          const approveHash = await approveERC20({
            tokenAddress: token as `0x${string}`,
            spender: dexAddress,
            amount: tokenWei,
          });
          await waitForReceipt(approveHash);
          log.dim(`Approved ${tokenInfo.symbol}`);

          // Add liquidity
          s.text = "Adding liquidity...";
          const hash = await callContractWithValue({
            address: dexAddress,
            abi,
            functionName: "addLiquidity",
            args: [token as `0x${string}`, tokenWei],
            value: usdcWei,
          });
          const receipt = await waitForReceipt(hash);

          s.succeed("Liquidity added");
          log.newline();

          table(
            ["Field", "Value"],
            [
              ["Pool", `USDC / ${tokenInfo.symbol}`],
              ["USDC Added", `${usdcAmount} USDC`],
              ["Token Added", `${tokenAmount} ${tokenInfo.symbol}`],
              ["Tx Hash", hash],
              ["Block", receipt.blockNumber.toString()],
            ]
          );

          log.newline();
          log.dim(`Swap: arc dex swap 1 usdc ${token}`);
          log.dim(`Remove: arc dex remove-liquidity ${token} --all`);
        } catch (err) {
          s.fail("Failed to add liquidity");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
      }
    );

  dex
    .command("remove-liquidity")
    .description("Remove liquidity from a USDC/Token pool")
    .argument("<token>", "ERC-20 token address")
    .option("--amount <lp>", "LP token amount to remove (raw)")
    .option("--all", "Remove all your liquidity")
    .option("--dex <address>", "DEX contract address")
    .action(async (token: string, opts: { amount?: string; all?: boolean; dex?: string }) => {
      if (!validateAddress(token)) {
        log.error(`Invalid token: ${token}`);
        process.exitCode = 1;
        return;
      }

      if (!opts.amount && !opts.all) {
        log.error("Specify --amount <lp> or --all");
        process.exitCode = 1;
        return;
      }

      const dexAddress = resolveDexAddress(opts);
      if (!dexAddress) {
        process.exitCode = 1;
        return;
      }

      const abi = loadDEXAbi();

      const s = spinner("Fetching pool info...");
      try {
        const tokenInfo = await getTokenInfo(token as `0x${string}`);
        const wallet = getWalletClient();
        const account = wallet.account!.address;

        let lpAmount: bigint;
        if (opts.all) {
          lpAmount = (await readContract({
            address: dexAddress,
            abi: abi as readonly unknown[],
            functionName: "getLPBalance",
            args: [token as `0x${string}`, account],
          })) as bigint;

          if (lpAmount === 0n) {
            s.fail("No liquidity to remove");
            log.warn("You have no LP tokens in this pool.");
            return;
          }
        } else {
          lpAmount = BigInt(opts.amount!);
        }

        log.title("Remove Liquidity");
        log.label("Pool", `USDC / ${tokenInfo.symbol}`);
        log.label("LP Tokens", lpAmount.toString());
        log.newline();

        s.text = "Removing liquidity...";
        const hash = await callContract({
          address: dexAddress,
          abi,
          functionName: "removeLiquidity",
          args: [token as `0x${string}`, lpAmount],
        });
        const receipt = await waitForReceipt(hash);

        s.succeed("Liquidity removed");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Pool", `USDC / ${tokenInfo.symbol}`],
            ["LP Burned", lpAmount.toString()],
            ["Tx Hash", hash],
            ["Block", receipt.blockNumber.toString()],
          ]
        );
      } catch (err) {
        s.fail("Failed to remove liquidity");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  dex
    .command("swap")
    .description("Swap between USDC and an ERC-20 token")
    .argument("<amount>", "Amount to swap")
    .argument("<from>", "Source: 'usdc' or token address")
    .argument("<to>", "Destination: 'usdc' or token address")
    .option("--dex <address>", "DEX contract address")
    .addHelpText(
      "after",
      `
Examples:
  $ arc dex swap 10 usdc 0xToken...        # Swap 10 USDC for tokens
  $ arc dex swap 5000 0xToken... usdc       # Swap 5000 tokens for USDC

Get a quote first: arc dex quote 10 usdc 0xToken...
`
    )
    .action(async (amount: string, from: string, to: string, opts: { dex?: string }) => {
      if (!validateAmount(amount)) {
        log.error(`Invalid amount: ${amount}`);
        process.exitCode = 1;
        return;
      }

      const usdcToToken = isUSDC(from) && !isUSDC(to);
      const tokenToUSDC = !isUSDC(from) && isUSDC(to);

      if (!usdcToToken && !tokenToUSDC) {
        log.error("One side must be 'usdc'. Example: arc dex swap 10 usdc 0xToken...");
        process.exitCode = 1;
        return;
      }

      const tokenAddress = usdcToToken ? to : from;
      if (!validateAddress(tokenAddress)) {
        log.error(`Invalid token address: ${tokenAddress}`);
        process.exitCode = 1;
        return;
      }

      const dexAddress = resolveDexAddress(opts);
      if (!dexAddress) {
        process.exitCode = 1;
        return;
      }

      const abi = loadDEXAbi();

      const s = spinner("Fetching token info...");
      try {
        const tokenInfo = await getTokenInfo(tokenAddress as `0x${string}`);
        const fromLabel = usdcToToken ? "USDC" : tokenInfo.symbol;
        const toLabel = usdcToToken ? tokenInfo.symbol : "USDC";

        // Get quote first
        const fromDecimals = usdcToToken ? NATIVE_USDC_DECIMALS : tokenInfo.decimals;
        const toDecimals = usdcToToken ? tokenInfo.decimals : NATIVE_USDC_DECIMALS;
        const amountWei = parseUnits(amount, fromDecimals);

        const quoteRaw = (await readContract({
          address: dexAddress,
          abi: abi as readonly unknown[],
          functionName: "getQuote",
          args: [tokenAddress as `0x${string}`, amountWei, usdcToToken],
        })) as bigint;

        const quoteFormatted = formatUnits(quoteRaw, toDecimals);

        log.title("Swap");
        log.label("From", `${amount} ${fromLabel}`);
        log.label("To", `~${parseFloat(quoteFormatted).toFixed(6)} ${toLabel}`);
        log.label(
          "Rate",
          `1 ${fromLabel} = ~${(parseFloat(quoteFormatted) / parseFloat(amount)).toFixed(6)} ${toLabel}`
        );
        log.newline();

        let hash: `0x${string}`;

        if (usdcToToken) {
          s.text = `Swapping ${amount} USDC for ${tokenInfo.symbol}...`;
          hash = await callContractWithValue({
            address: dexAddress,
            abi,
            functionName: "swapUSDCForToken",
            args: [tokenAddress as `0x${string}`],
            value: amountWei,
          });
        } else {
          // Approve token first
          s.text = `Approving ${tokenInfo.symbol}...`;
          const approveHash = await approveERC20({
            tokenAddress: tokenAddress as `0x${string}`,
            spender: dexAddress,
            amount: amountWei,
          });
          await waitForReceipt(approveHash);

          s.text = `Swapping ${amount} ${tokenInfo.symbol} for USDC...`;
          hash = await callContract({
            address: dexAddress,
            abi,
            functionName: "swapTokenForUSDC",
            args: [tokenAddress as `0x${string}`, amountWei],
          });
        }

        const receipt = await waitForReceipt(hash);
        s.succeed("Swap complete");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Sold", `${amount} ${fromLabel}`],
            ["Received", `~${parseFloat(quoteFormatted).toFixed(6)} ${toLabel}`],
            ["Fee", "0.3%"],
            ["Tx Hash", hash],
            ["Block", receipt.blockNumber.toString()],
          ]
        );

        log.newline();
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/tx/${hash}`);
      } catch (err) {
        s.fail("Swap failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  dex
    .command("quote")
    .description("Get a swap quote without executing")
    .argument("<amount>", "Amount to swap")
    .argument("<from>", "Source: 'usdc' or token address")
    .argument("<to>", "Destination: 'usdc' or token address")
    .option("--dex <address>", "DEX contract address")
    .action(async (amount: string, from: string, to: string, opts: { dex?: string }) => {
      if (!validateAmount(amount)) {
        log.error(`Invalid amount: ${amount}`);
        process.exitCode = 1;
        return;
      }

      const usdcToToken = isUSDC(from) && !isUSDC(to);
      const tokenToUSDC = !isUSDC(from) && isUSDC(to);

      if (!usdcToToken && !tokenToUSDC) {
        log.error("One side must be 'usdc'. Example: arc dex quote 10 usdc 0xToken...");
        process.exitCode = 1;
        return;
      }

      const tokenAddress = usdcToToken ? to : from;
      if (!validateAddress(tokenAddress)) {
        log.error(`Invalid token address: ${tokenAddress}`);
        process.exitCode = 1;
        return;
      }

      const dexAddress = resolveDexAddress(opts);
      if (!dexAddress) {
        process.exitCode = 1;
        return;
      }

      const abi = loadDEXAbi();

      try {
        const tokenInfo = await getTokenInfo(tokenAddress as `0x${string}`);
        const fromLabel = usdcToToken ? "USDC" : tokenInfo.symbol;
        const toLabel = usdcToToken ? tokenInfo.symbol : "USDC";

        const fromDecimals = usdcToToken ? NATIVE_USDC_DECIMALS : tokenInfo.decimals;
        const toDecimals = usdcToToken ? tokenInfo.decimals : NATIVE_USDC_DECIMALS;
        const amountWei = parseUnits(amount, fromDecimals);

        const quoteRaw = (await readContract({
          address: dexAddress,
          abi: abi as readonly unknown[],
          functionName: "getQuote",
          args: [tokenAddress as `0x${string}`, amountWei, usdcToToken],
        })) as bigint;

        const quoteFormatted = formatUnits(quoteRaw, toDecimals);
        const rate = parseFloat(quoteFormatted) / parseFloat(amount);

        log.title("Swap Quote");
        table(
          ["Field", "Value"],
          [
            ["Input", `${amount} ${fromLabel}`],
            ["Output", `${parseFloat(quoteFormatted).toFixed(6)} ${toLabel}`],
            ["Rate", `1 ${fromLabel} = ${rate.toFixed(6)} ${toLabel}`],
            ["Fee", "0.3%"],
          ]
        );

        log.newline();
        log.dim(`Execute: arc dex swap ${amount} ${from} ${to}`);
      } catch (err) {
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  dex
    .command("pools")
    .description("List all liquidity pools")
    .option("--dex <address>", "DEX contract address")
    .action(async (opts: { dex?: string }) => {
      const dexAddress = resolveDexAddress(opts);
      if (!dexAddress) {
        process.exitCode = 1;
        return;
      }

      const abi = loadDEXAbi();

      const s = spinner("Fetching pools...");
      try {
        const poolCount = (await readContract({
          address: dexAddress,
          abi: abi as readonly unknown[],
          functionName: "getPoolCount",
        })) as bigint;

        if (poolCount === 0n) {
          s.succeed("No pools");
          log.warn("No pools found. Create one with: arc dex create-pool <token-address>");
          return;
        }

        const rows: string[][] = [];
        const wallet = getWalletClient();
        const account = wallet.account!.address;

        for (let i = 0n; i < poolCount; i++) {
          const tokenAddr = (await readContract({
            address: dexAddress,
            abi: abi as readonly unknown[],
            functionName: "getPoolToken",
            args: [i],
          })) as string;

          const [reserves, tokenInfo, lpBalance] = await Promise.all([
            readContract({
              address: dexAddress,
              abi: abi as readonly unknown[],
              functionName: "getReserves",
              args: [tokenAddr],
            }) as Promise<[bigint, bigint]>,
            getTokenInfo(tokenAddr as `0x${string}`),
            readContract({
              address: dexAddress,
              abi: abi as readonly unknown[],
              functionName: "getLPBalance",
              args: [tokenAddr, account],
            }) as Promise<bigint>,
          ]);

          const usdcReserve = formatUnits(reserves[0], NATIVE_USDC_DECIMALS);
          const tokenReserve = formatUnits(reserves[1], tokenInfo.decimals);

          rows.push([
            String(Number(i) + 1),
            `USDC / ${tokenInfo.symbol}`,
            `${parseFloat(usdcReserve).toFixed(2)} USDC`,
            `${parseFloat(tokenReserve).toFixed(2)} ${tokenInfo.symbol}`,
            lpBalance > 0n ? lpBalance.toString() : "-",
            tokenAddr,
          ]);
        }

        s.succeed(`${poolCount} pool(s) found`);
        log.newline();

        table(["#", "Pair", "USDC Reserve", "Token Reserve", "Your LP", "Token Address"], rows);
      } catch (err) {
        s.fail("Failed to fetch pools");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
