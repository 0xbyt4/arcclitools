import {
  createPublicClient,
  createWalletClient,
  http,
  fallback,
  formatGwei,
  formatUnits,
  parseUnits,
  parseAbi,
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
import { ARC_TESTNET, ALTERNATIVE_RPCS, NATIVE_USDC_DECIMALS, ERC20_ABI } from "../config/constants.js";

const erc20Abi = parseAbi(ERC20_ABI as readonly string[]);

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

function buildTransport() {
  const primaryUrl = getRpcUrl();
  const transports = [http(primaryUrl)];
  for (const url of ALTERNATIVE_RPCS) {
    if (url !== primaryUrl) transports.push(http(url));
  }
  return fallback(transports);
}

export function getPublicClient(): PublicClient<Transport, Chain> {
  if (!clientInstance) {
    clientInstance = createPublicClient({
      chain: arcTestnet,
      transport: buildTransport(),
    }) as PublicClient<Transport, Chain>;
  }
  return clientInstance;
}

export function resetClient(): void {
  clientInstance = null;
  walletInstance = null;
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

let walletInstance: WalletClient | null = null;

export function getWalletClient(): WalletClient {
  if (!walletInstance) {
    const key = requirePrivateKey() as `0x${string}`;
    const account = privateKeyToAccount(key);
    walletInstance = createWalletClient({
      account,
      chain: arcTestnet,
      transport: buildTransport(),
    });
  }
  return walletInstance;
}

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

  const decimals =
    params.decimals ??
    ((await client.readContract({
      address: params.tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    })) as number);

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

export async function callContract(params: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: unknown[];
}): Promise<`0x${string}`> {
  const wallet = getWalletClient();
  const account = wallet.account!;

  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });

  const hash = await wallet.sendTransaction({
    account,
    chain: arcTestnet,
    to: params.address,
    data,
  });

  return hash;
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

export async function approveERC20(params: {
  tokenAddress: `0x${string}`;
  spender: `0x${string}`;
  amount: bigint;
}): Promise<`0x${string}`> {
  const wallet = getWalletClient();
  const account = wallet.account!;

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [params.spender, params.amount],
  });

  const hash = await wallet.sendTransaction({
    account,
    chain: arcTestnet,
    to: params.tokenAddress,
    data,
  });

  return hash;
}

export async function getTokenInfo(
  tokenAddress: `0x${string}`
): Promise<{ symbol: string; decimals: number }> {
  const client = getPublicClient();

  const [symbol, decimals] = await Promise.all([
    client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  return { symbol: symbol as string, decimals: Number(decimals) };
}

export async function callContractWithValue(params: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  value: bigint;
}): Promise<`0x${string}`> {
  const wallet = getWalletClient();
  const account = wallet.account!;

  const data = encodeFunctionData({
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  });

  const hash = await wallet.sendTransaction({
    account,
    chain: arcTestnet,
    to: params.address,
    data,
    value: params.value,
  });

  return hash;
}
