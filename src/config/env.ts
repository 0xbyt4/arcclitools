import dotenv from "dotenv";
import { getConfig } from "./store.js";
import { ARC_TESTNET } from "./constants.js";

dotenv.config();

export function getApiKey(): string | undefined {
  return (getConfig("apiKey") as string) || process.env.CIRCLE_API_KEY;
}

export function getEntitySecret(): string | undefined {
  return (getConfig("entitySecret") as string) || process.env.CIRCLE_ENTITY_SECRET;
}

export function getRpcUrl(): string {
  return (getConfig("rpcUrl") as string) || process.env.ARC_RPC_URL || ARC_TESTNET.rpcUrl;
}

export function getPrivateKey(): string | undefined {
  return (getConfig("privateKey") as string) || process.env.PRIVATE_KEY;
}

export function getPinataJWT(): string | undefined {
  return (getConfig("pinataJwt") as string) || process.env.PINATA_JWT;
}

export function requirePinataJWT(): string {
  const jwt = getPinataJWT();
  if (!jwt) {
    throw new Error(
      "Pinata JWT not found. Set it with:\n" +
        "  arc config set pinata-jwt <your-jwt>\n" +
        "  or set PINATA_JWT in .env\n\n" +
        "Get your JWT at: https://app.pinata.cloud/developers/api-keys"
    );
  }
  return jwt;
}

export function getX402Port(): number {
  const configPort = getConfig("x402Port");
  if (configPort) return Number(configPort);
  if (process.env.X402_PORT) return Number(process.env.X402_PORT);
  return 3000;
}

export function getX402Price(): string {
  return (getConfig("x402Price") as string) || process.env.X402_PRICE || "0.01";
}

export function requireApiKey(): string {
  const key = getApiKey();
  if (!key) {
    throw new Error(
      "Circle API key not found. Set it with:\n" +
        "  arc config set api-key <your-key>\n" +
        "  or set CIRCLE_API_KEY in .env"
    );
  }
  return key;
}

export function requireEntitySecret(): string {
  const secret = getEntitySecret();
  if (!secret) {
    throw new Error(
      "Circle entity secret not found. Set it with:\n" +
        "  arc config set entity-secret <your-secret>\n" +
        "  or set CIRCLE_ENTITY_SECRET in .env"
    );
  }
  return secret;
}

export function requirePrivateKey(): string {
  const key = getPrivateKey();
  if (!key) {
    throw new Error(
      "Private key not found. Set it with:\n" +
        "  arc config set private-key <your-key>\n" +
        "  or set PRIVATE_KEY in .env"
    );
  }
  return key;
}
