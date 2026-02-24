import {
  createPublicClient,
  http,
  formatGwei,
  formatUnits,
  defineChain,
  type PublicClient,
  type Chain,
  type Transport,
} from "viem";
import { getRpcUrl } from "../config/env.js";
import { ARC_TESTNET, NATIVE_USDC_DECIMALS } from "../config/constants.js";

export const arcTestnet: Chain = defineChain({
  id: ARC_TESTNET.chainId,
  name: ARC_TESTNET.name,
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: NATIVE_USDC_DECIMALS,
  },
  rpcUrls: {
    default: { http: [ARC_TESTNET.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: ARC_TESTNET.explorer },
  },
});

let clientInstance: PublicClient<Transport, Chain> | null = null;

export function getPublicClient(): PublicClient<Transport, Chain> {
  if (!clientInstance) {
    clientInstance = createPublicClient({
      chain: arcTestnet,
      transport: http(getRpcUrl()),
    }) as PublicClient<Transport, Chain>;
  }
  return clientInstance;
}

export function resetClient(): void {
  clientInstance = null;
}

export async function getBlockNumber(): Promise<bigint> {
  const client = getPublicClient();
  return client.getBlockNumber();
}

export async function getGasPrice(): Promise<bigint> {
  const client = getPublicClient();
  return client.getGasPrice();
}

export async function getBaseFee(): Promise<{ baseFee: bigint; blockNumber: bigint }> {
  const client = getPublicClient();
  const block = await client.getBlock({ blockTag: "latest" });
  return {
    baseFee: block.baseFeePerGas ?? 0n,
    blockNumber: block.number,
  };
}

export async function getBalance(address: `0x${string}`): Promise<bigint> {
  const client = getPublicClient();
  return client.getBalance({ address });
}

export async function getTransaction(hash: `0x${string}`) {
  const client = getPublicClient();
  return client.getTransaction({ hash });
}

export async function getTransactionReceipt(hash: `0x${string}`) {
  const client = getPublicClient();
  return client.getTransactionReceipt({ hash });
}

export async function getBlock(blockNumber?: bigint) {
  const client = getPublicClient();
  if (blockNumber !== undefined) {
    return client.getBlock({ blockNumber });
  }
  return client.getBlock({ blockTag: "latest" });
}

export async function readContract(params: {
  address: `0x${string}`;
  abi: readonly unknown[];
  functionName: string;
  args?: unknown[];
}) {
  const client = getPublicClient();
  return client.readContract(params);
}

export async function getChainId(): Promise<number> {
  const client = getPublicClient();
  return client.getChainId();
}

export function formatGasToUSDC(gasUsed: bigint, gasPrice: bigint): string {
  const cost = gasUsed * gasPrice;
  return formatUnits(cost, NATIVE_USDC_DECIMALS);
}

export function formatGasPriceDisplay(gasPrice: bigint): {
  gwei: string;
  estimatedTxCost: string;
} {
  const gwei = formatGwei(gasPrice);
  const estimatedGas = 21000n;
  const cost = estimatedGas * gasPrice;
  const usdcCost = formatUnits(cost, NATIVE_USDC_DECIMALS);
  return {
    gwei,
    estimatedTxCost: `~${parseFloat(usdcCost).toFixed(6)} USDC`,
  };
}
