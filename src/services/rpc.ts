import {
  createPublicClient,
  createWalletClient,
  http,
  formatGwei,
  formatUnits,
  parseUnits,
  encodeDeployData,
  encodeFunctionData,
  defineChain,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getRpcUrl, requirePrivateKey } from "../config/env.js";
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

export async function waitForReceipt(hash: `0x${string}`) {
  const client = getPublicClient();
  return client.waitForTransactionReceipt({ hash });
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

export function getWalletClient(): WalletClient {
  const key = requirePrivateKey() as `0x${string}`;
  const account = privateKeyToAccount(key);
  return createWalletClient({
    account,
    chain: arcTestnet,
    transport: http(getRpcUrl()),
  });
}

const erc20Abi = [
  {
    type: "function" as const,
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable" as const,
  },
  {
    type: "function" as const,
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
    stateMutability: "view" as const,
  },
] as const;

export async function sendNativeUSDC(params: {
  to: `0x${string}`;
  amount: string;
}): Promise<{ hash: `0x${string}`; from: string }> {
  const wallet = getWalletClient();
  const account = wallet.account!;
  const value = parseUnits(params.amount, NATIVE_USDC_DECIMALS);

  const hash = await wallet.sendTransaction({
    account,
    chain: arcTestnet,
    to: params.to,
    value,
  });

  return { hash, from: account.address };
}

export async function sendERC20(params: {
  to: `0x${string}`;
  amount: string;
  tokenAddress: `0x${string}`;
  decimals?: number;
}): Promise<{ hash: `0x${string}`; from: string }> {
  const wallet = getWalletClient();
  const account = wallet.account!;
  const client = getPublicClient();

  const decimals = params.decimals ?? await client.readContract({
    address: params.tokenAddress,
    abi: erc20Abi,
    functionName: "decimals",
  });

  const value = parseUnits(params.amount, decimals);

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [params.to, value],
  });

  const hash = await wallet.sendTransaction({
    account,
    chain: arcTestnet,
    to: params.tokenAddress,
    data,
  });

  return { hash, from: account.address };
}

export async function deployContract(params: {
  abi: Abi;
  bytecode: `0x${string}`;
  args?: unknown[];
}): Promise<{ hash: `0x${string}`; from: string; address: string }> {
  const wallet = getWalletClient();
  const account = wallet.account!;
  const client = getPublicClient();

  const deployData = encodeDeployData({
    abi: params.abi,
    bytecode: params.bytecode,
    args: params.args,
  });

  const hash = await wallet.sendTransaction({
    account,
    chain: arcTestnet,
    data: deployData,
  });

  const receipt = await client.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error("Contract deployment failed - no contract address in receipt");
  }

  return { hash, from: account.address, address: receipt.contractAddress };
}
