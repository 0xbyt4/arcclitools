import { BridgeKit } from "@circle-fin/bridge-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { requireApiKey, requireEntitySecret } from "../config/env.js";

const SUPPORTED_CHAINS = [
  "Arbitrum_Sepolia",
  "Avalanche_Fuji",
  "Base_Sepolia",
  "Ethereum_Sepolia",
  "Optimism_Sepolia",
  "Polygon_Amoy_Testnet",
  "Solana_Devnet",
  "Unichain_Sepolia",
  "Arc_Testnet",
] as const;

export type BridgeChain = (typeof SUPPORTED_CHAINS)[number];

export function getSupportedChains(): readonly string[] {
  return SUPPORTED_CHAINS;
}

function getAdapter() {
  return createCircleWalletsAdapter({
    apiKey: requireApiKey(),
    entitySecret: requireEntitySecret(),
  });
}

export async function bridgeToArc(params: {
  sourceChain: BridgeChain;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
}) {
  const kit = new BridgeKit();
  const adapter = getAdapter();

  const result = await kit.bridge({
    from: {
      adapter,
      chain: params.sourceChain,
      address: params.sourceAddress,
    },
    to: {
      adapter,
      chain: "Arc_Testnet",
      address: params.destinationAddress,
    },
    amount: params.amount,
  });

  return result;
}

export async function bridgeFromArc(params: {
  destinationChain: BridgeChain;
  sourceAddress: string;
  destinationAddress: string;
  amount: string;
}) {
  const kit = new BridgeKit();
  const adapter = getAdapter();

  const result = await kit.bridge({
    from: {
      adapter,
      chain: "Arc_Testnet",
      address: params.sourceAddress,
    },
    to: {
      adapter,
      chain: params.destinationChain,
      address: params.destinationAddress,
    },
    amount: params.amount,
  });

  return result;
}
