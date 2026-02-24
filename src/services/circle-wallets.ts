import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { requireApiKey, requireEntitySecret } from "../config/env.js";
import { ARC_BLOCKCHAIN_ID } from "../config/constants.js";

function getClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: requireApiKey(),
    entitySecret: requireEntitySecret(),
  });
}

export async function createWalletSet(name: string) {
  const client = getClient();
  const response = await client.createWalletSet({ name });
  return response.data?.walletSet;
}

export async function createWallet(walletSetId: string, count = 1) {
  const client = getClient();
  const response = await client.createWallets({
    blockchains: [ARC_BLOCKCHAIN_ID],
    count,
    walletSetId,
  });
  return response.data?.wallets;
}

export async function listWallets(pageSize = 10) {
  const client = getClient();
  const response = await client.listWallets({
    blockchain: ARC_BLOCKCHAIN_ID,
    pageSize,
  });
  return response.data?.wallets;
}

export async function getWalletBalance(walletId: string) {
  const client = getClient();
  const response = await client.getWalletTokenBalance({ id: walletId });
  return response.data?.tokenBalances;
}

export async function createTransfer(params: {
  walletAddress: string;
  destinationAddress: string;
  amount: string;
  tokenAddress: string;
}) {
  const client = getClient();
  const response = await client.createTransaction({
    amount: [params.amount],
    destinationAddress: params.destinationAddress,
    tokenAddress: params.tokenAddress,
    blockchain: ARC_BLOCKCHAIN_ID,
    walletAddress: params.walletAddress,
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });
  return response.data;
}

export async function getTransaction(transactionId: string) {
  const client = getClient();
  const response = await client.getTransaction({ id: transactionId });
  return response.data;
}

export async function requestTestnetTokens(params: {
  address: string;
  usdc?: boolean;
  eurc?: boolean;
  native?: boolean;
}) {
  const client = getClient();
  const response = await client.requestTestnetTokens({
    address: params.address,
    blockchain: ARC_BLOCKCHAIN_ID as "ARC-TESTNET",
    usdc: params.usdc,
    eurc: params.eurc,
    native: params.native,
  });
  return response.status;
}

export async function executeContractCall(params: {
  walletId: string;
  contractAddress: string;
  abiFunctionSignature: string;
  abiParameters: unknown[];
}) {
  const client = getClient();
  const response = await client.createContractExecutionTransaction({
    walletId: params.walletId,
    contractAddress: params.contractAddress,
    abiFunctionSignature: params.abiFunctionSignature,
    abiParameters: params.abiParameters,
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });
  return response.data;
}
