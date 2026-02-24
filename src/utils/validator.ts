import { isAddress, isHash } from "viem";

export function validateAddress(address: string): boolean {
  return isAddress(address);
}

export function validateTxHash(hash: string): boolean {
  return isHash(hash);
}

export function validateAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
}

export function validatePrivateKey(key: string): boolean {
  const cleaned = key.startsWith("0x") ? key.slice(2) : key;
  return /^[0-9a-fA-F]{64}$/.test(cleaned);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function requireValidAddress(address: string, label = "Address"): string {
  if (!validateAddress(address)) {
    throw new Error(`Invalid ${label}: ${address}`);
  }
  return address;
}

export function requireValidTxHash(hash: string): string {
  if (!validateTxHash(hash)) {
    throw new Error(`Invalid transaction hash: ${hash}`);
  }
  return hash;
}

export function requireValidAmount(amount: string): string {
  if (!validateAmount(amount)) {
    throw new Error(`Invalid amount: ${amount}. Must be a positive number.`);
  }
  return amount;
}
