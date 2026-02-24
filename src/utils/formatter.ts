import chalk from "chalk";
import { formatUnits, formatGwei } from "viem";

export function shortenAddress(address: string, chars = 6): string {
  if (address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function shortenHash(hash: string, chars = 8): string {
  if (hash.length < chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

export function formatUSDC(amount: bigint, decimals = 18): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return "0.00 USDC";
  if (num < 0.01) return `${formatted} USDC`;
  return `${num.toFixed(num < 1 ? 6 : 2)} USDC`;
}

export function formatToken(amount: bigint, decimals: number, symbol: string): string {
  const formatted = formatUnits(amount, decimals);
  const num = parseFloat(formatted);
  if (num === 0) return `0.00 ${symbol}`;
  if (num < 0.01) return `${formatted} ${symbol}`;
  return `${num.toFixed(num < 1 ? 6 : 2)} ${symbol}`;
}

export function formatGasPrice(weiValue: bigint): string {
  return `${formatGwei(weiValue)} Gwei`;
}

export function formatBlockNumber(blockNumber: bigint): string {
  return blockNumber.toLocaleString();
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function explorerTxUrl(baseUrl: string, hash: string): string {
  return `${baseUrl}/tx/${hash}`;
}

export function explorerAddressUrl(baseUrl: string, address: string): string {
  return `${baseUrl}/address/${address}`;
}

export function colorStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "success":
    case "confirmed":
    case "complete":
      return chalk.green(status);
    case "pending":
    case "processing":
      return chalk.yellow(status);
    case "failed":
    case "reverted":
    case "error":
      return chalk.red(status);
    default:
      return status;
  }
}

export function maskSecret(value: string): string {
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
