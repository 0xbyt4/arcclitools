import { ARC_TESTNET } from "../config/constants.js";
import { validateAddress } from "./validator.js";

export const TOKEN_ALIASES: Record<string, { address: string; decimals: number; name: string }> = {
  usdc: { address: ARC_TESTNET.contracts.USDC.address, decimals: 6, name: "USDC (ERC-20)" },
  eurc: { address: ARC_TESTNET.contracts.EURC.address, decimals: 6, name: "EURC" },
  usyc: { address: ARC_TESTNET.contracts.USYC.address, decimals: 6, name: "USYC" },
};

export function resolveToken(
  token?: string
): { address: string; decimals?: number; name: string } | null {
  if (!token) return null;

  const alias = TOKEN_ALIASES[token.toLowerCase()];
  if (alias) return alias;

  if (validateAddress(token)) {
    return { address: token, name: token.slice(0, 10) + "..." };
  }

  return null;
}
