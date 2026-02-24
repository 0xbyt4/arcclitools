import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { requirePrivateKey, getRpcUrl } from "../config/env.js";

export async function payForResource(url: string): Promise<Response> {
  const privateKey = requirePrivateKey();

  const client = new x402Client();
  // Register EVM scheme for Arc Testnet - requires @x402/evm at runtime
  // For now, use the HTTP client approach which is simpler
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
