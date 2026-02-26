import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { log, table, spinner } from "../utils/logger.js";
import { validateAddress } from "../utils/validator.js";
import { shortenAddress, shortenHash } from "../utils/formatter.js";
import { ARC_TESTNET, NATIVE_USDC_DECIMALS } from "../config/constants.js";
import { getBalance } from "../services/rpc.js";
import { formatUnits } from "viem";
import chalk from "chalk";

// ── Types ──

interface TokenBalance {
  name: string;
  symbol: string;
  type: string;
  value: string;
  decimals: number | null;
  address: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  input: string;
  timeStamp: string;
  isError: string;
  contractAddress: string;
  functionName?: string;
}

// ── Arcscan API ──

const ARCSCAN_API = `${ARC_TESTNET.explorer}/api`;
const ARCSCAN_API_V2 = `${ARC_TESTNET.explorer}/api/v2`;

async function fetchTokenBalances(address: string): Promise<TokenBalance[]> {
  const res = await fetch(`${ARCSCAN_API_V2}/addresses/${address}/token-balances`);
  if (!res.ok) throw new Error(`Arcscan API error: ${res.status}`);
  const data = (await res.json()) as Array<{
    token: {
      name: string;
      symbol: string;
      type: string;
      address_hash: string;
      decimals: string | null;
    };
    value: string;
  }>;
  return data.map((item) => ({
    name: item.token.name,
    symbol: item.token.symbol,
    type: item.token.type,
    value: item.value,
    decimals: item.token.decimals ? parseInt(item.token.decimals, 10) : null,
    address: item.token.address_hash,
  }));
}

async function fetchTransactions(address: string, limit: number): Promise<Transaction[]> {
  const res = await fetch(
    `${ARCSCAN_API}?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=${limit}`
  );
  if (!res.ok) throw new Error(`Arcscan API error: ${res.status}`);
  const data = (await res.json()) as { result: Transaction[] };
  return data.result || [];
}

// ── Formatting Helpers ──

function formatTokenAmount(value: string, decimals: number | null): string {
  if (!decimals) return value;
  const num = parseFloat(formatUnits(BigInt(value), decimals));
  if (num === 0) return "0";
  if (num < 0.01) return "<0.01";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
}

function timeAgo(timestamp: string): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - parseInt(timestamp, 10);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function describeTx(tx: Transaction, address: string): string {
  const addr = address.toLowerCase();

  // contract creation
  if (tx.contractAddress) {
    return chalk.cyan("Deploy contract");
  }

  // plain value transfer
  if (!tx.input || tx.input === "0x" || tx.input === "") {
    const value = parseFloat(formatUnits(BigInt(tx.value), NATIVE_USDC_DECIMALS));
    if (tx.from.toLowerCase() === addr) {
      return chalk.red(`Send ${value.toFixed(4)} USDC`);
    }
    return chalk.green(`Receive ${value.toFixed(4)} USDC`);
  }

  // contract call: 0x + 8-char method selector + ABI-encoded args (each arg is 64 hex chars)
  // input length must be 10 (selector only) or 10 + n*64 (selector + args)
  const inputHexLen = tx.input.length - 2; // strip "0x"
  const isContractCall = inputHexLen >= 8 && (inputHexLen - 8) % 64 === 0;

  if (isContractCall) {
    const methodId = tx.input.slice(0, 10);
    const knownMethods: Record<string, string> = {
      "0x095ea7b3": "Approve",
      "0xa9059cbb": "Transfer token",
      "0x23b872dd": "TransferFrom",
      "0x56688700": "Add liquidity",
      "0xe86a8f11": "Remove liquidity",
      "0x38ed1739": "Swap",
      "0x9049f9d2": "Create pool",
      "0x40c10f19": "Mint",
      "0x42966c68": "Burn",
    };
    return chalk.yellow(knownMethods[methodId] || `Contract call`);
  }

  // on-chain message: has input data that doesn't match contract call pattern
  return chalk.blue("On-chain message");
}

// ── Wallet address helper ──

function getDefaultAddress(): string | undefined {
  try {
    const envPath = resolve(process.cwd(), ".env");
    if (!existsSync(envPath)) return undefined;
    const match = readFileSync(envPath, "utf-8").match(/^WALLET_ADDRESS=(.+)$/m);
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

// ── Command ──

export function registerPortfolioCommand(program: Command): void {
  program
    .command("portfolio")
    .description("Full portfolio overview: balances, NFTs, and recent transactions")
    .argument("[address]", "Wallet address (default: from .env)")
    .option("-n, --limit <number>", "Number of recent transactions", "10")
    .action(async (address: string | undefined, opts: { limit: string }) => {
      const addr = address || getDefaultAddress();
      if (!addr) {
        log.error("No address provided. Pass an address or set WALLET_ADDRESS in .env");
        process.exitCode = 1;
        return;
      }

      if (!validateAddress(addr)) {
        log.error(`Invalid address: ${addr}`);
        process.exitCode = 1;
        return;
      }

      const txLimit = parseInt(opts.limit, 10);
      if (isNaN(txLimit) || txLimit < 1 || txLimit > 50) {
        log.error("Limit must be between 1 and 50");
        process.exitCode = 1;
        return;
      }

      const s = spinner("Fetching portfolio from Arcscan...");

      try {
        // Fetch all data in parallel
        const [nativeBalance, tokenBalances, transactions] = await Promise.all([
          getBalance(addr as `0x${string}`),
          fetchTokenBalances(addr),
          fetchTransactions(addr, txLimit),
        ]);

        s.succeed("Portfolio loaded");

        // ── Header ──
        log.title(`Portfolio: ${shortenAddress(addr)}`);
        log.label("Address", addr);
        log.label("Explorer", `${ARC_TESTNET.explorer}/address/${addr}`);
        log.newline();

        // ── Native Balance ──
        const nativeUsdc = parseFloat(formatUnits(nativeBalance, NATIVE_USDC_DECIMALS));
        log.label("Native USDC", `${nativeUsdc.toFixed(4)} USDC`);
        log.newline();

        // ── ERC-20 Tokens ──
        const erc20s = tokenBalances.filter((t) => t.type === "ERC-20");
        const nfts = tokenBalances.filter((t) => t.type === "ERC-721" || t.type === "ERC-1155");

        if (erc20s.length > 0) {
          console.log(chalk.bold.cyan("  Tokens"));
          log.divider();
          table(
            ["Token", "Balance", "Contract"],
            erc20s.map((t) => [
              `${t.name} (${t.symbol})`,
              formatTokenAmount(t.value, t.decimals),
              shortenAddress(t.address),
            ])
          );
          log.newline();
        }

        // ── NFTs ──
        if (nfts.length > 0) {
          console.log(chalk.bold.cyan("  NFTs"));
          log.divider();
          table(
            ["Collection", "Type", "Count", "Contract"],
            nfts.map((t) => [`${t.name} (${t.symbol})`, t.type, t.value, shortenAddress(t.address)])
          );
          log.newline();
        }

        // ── Transactions ──
        if (transactions.length > 0) {
          console.log(chalk.bold.cyan(`  Recent Transactions (${transactions.length})`));
          log.divider();
          table(
            ["Hash", "Action", "To/Contract", "Time"],
            transactions.map((tx) => [
              shortenHash(tx.hash, 6),
              describeTx(tx, addr),
              tx.contractAddress
                ? shortenAddress(tx.contractAddress)
                : tx.to
                  ? shortenAddress(tx.to)
                  : "Contract creation",
              timeAgo(tx.timeStamp),
            ])
          );
          log.newline();
        } else {
          log.dim("  No transactions found");
          log.newline();
        }

        // ── Summary ──
        log.divider();
        log.label("Tokens", `${erc20s.length} ERC-20`);
        log.label(
          "NFTs",
          `${nfts.length} collections (${nfts.reduce((sum, n) => sum + parseInt(n.value, 10), 0)} total)`
        );
        log.label("Transactions", `${transactions.length} shown`);
        log.newline();
      } catch (err) {
        s.fail("Failed to fetch portfolio");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
