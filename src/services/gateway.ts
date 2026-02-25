import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { requireApiKey, requireEntitySecret } from "../config/env.js";
import { ARC_TESTNET } from "../config/constants.js";

function getClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: requireApiKey(),
    entitySecret: requireEntitySecret(),
  });
}

export async function depositToGateway(params: { walletId: string; amount: string }) {
  const client = getClient();
  const response = await client.createContractExecutionTransaction({
    walletId: params.walletId,
    contractAddress: ARC_TESTNET.contracts.GatewayWallet.address,
    abiFunctionSignature: "deposit(uint256)",
    abiParameters: [params.amount],
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });
  return response.data;
}

export async function transferViaGateway(params: {
  walletId: string;
  sourceAddress: string;
  destinationAddress: string;
  destinationBlockchain: string;
  amount: string;
}) {
  const client = getClient();
  const response = await client.createTransaction({
    amount: [params.amount],
    destinationAddress: params.destinationAddress,
    tokenAddress: ARC_TESTNET.contracts.USDC.address,
    blockchain: params.destinationBlockchain as "ARC-TESTNET" | "ETH-SEPOLIA" | "BASE-SEPOLIA",
    walletAddress: params.sourceAddress,
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });
  return response.data;
}

export async function getGatewayBalance(walletId: string) {
  const client = getClient();
  const response = await client.getWalletTokenBalance({ id: walletId });
  return response.data?.tokenBalances;
}
