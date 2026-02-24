import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http } from "viem";
import { requirePrivateKey, getRpcUrl } from "../config/env.js";
import { ARC_TESTNET } from "../config/constants.js";

function createPaymentClient(): x402Client {
  const key = requirePrivateKey();
  const account = privateKeyToAccount(key as `0x${string}`);

  const publicClient = createPublicClient({
    transport: http(getRpcUrl()),
  });

  const signer = toClientEvmSigner(account, publicClient);

  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer,
    networks: [`eip155:${ARC_TESTNET.chainId}`],
  });

  return client;
}

export async function payForResource(url: string): Promise<Response> {
  const client = createPaymentClient();
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  return fetchWithPayment(url);
}

export async function testEndpoint(url: string): Promise<{
  status: number;
  requiresPayment: boolean;
  price?: string;
  headers: Record<string, string>;
}> {
  const response = await fetch(url, { method: "GET" });
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: response.status,
    requiresPayment: response.status === 402,
    price: headers["x-payment-amount"] || headers["x-price"],
    headers,
  };
}
