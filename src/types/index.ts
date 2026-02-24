export interface ArcNetwork {
  name: string;
  chainId: number;
  rpcUrl: string;
  wsUrl: string;
  explorer: string;
  faucet: string;
  cctpDomain: number;
  contracts: Record<string, ContractInfo>;
}

export interface ContractInfo {
  address: string;
  description: string;
  decimals?: number;
}

export interface ConfigStore {
  apiKey?: string;
  entitySecret?: string;
  rpcUrl?: string;
  network?: "testnet" | "mainnet";
  privateKey?: string;
  x402Port?: number;
  x402Price?: string;
  pinataJwt?: string;
}

export type ConfigKey = keyof ConfigStore;

export interface WalletInfo {
  id: string;
  address: string;
  blockchain: string;
  state: string;
  walletSetId: string;
  createDate?: string;
}

export interface TokenBalance {
  token: string;
  symbol: string;
  amount: string;
  decimals: number;
}

export interface TransferParams {
  from: string;
  to: string;
  amount: string;
  tokenAddress: string;
}

export interface BridgeParams {
  sourceChain: string;
  destinationChain: string;
  amount: string;
  recipientAddress: string;
}

export interface DeployParams {
  contractPath?: string;
  template?: string;
  constructorArgs?: string[];
  name?: string;
  symbol?: string;
}

export interface ContractCallParams {
  address: string;
  abi: string;
  functionName: string;
  args?: string[];
  value?: string;
}

export interface X402RouteConfig {
  path: string;
  price: string;
  description?: string;
}

export interface X402ServerConfig {
  port: number;
  price: string;
  payTo: string;
  routes?: X402RouteConfig[];
}

export interface GasInfo {
  baseFee: string;
  baseFeeGwei: string;
  estimatedCostUSDC: string;
  blockNumber: bigint;
}

export interface TransactionInfo {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  status?: "success" | "reverted" | "pending";
  blockNumber?: bigint;
  timestamp?: number;
}

export interface EvmDifference {
  area: string;
  ethereum: string;
  arc: string;
}

export interface ProviderInfo {
  name: string;
  url: string;
  description: string;
  category: "node" | "indexer" | "aa" | "compliance" | "explorer";
}
