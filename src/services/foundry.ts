import { execFileSync, type ExecFileSyncOptions } from "child_process";
import { getRpcUrl, requirePrivateKey } from "../config/env.js";

const execOptions: ExecFileSyncOptions = {
  encoding: "utf-8",
  stdio: ["pipe", "pipe", "pipe"],
  timeout: 120000,
};

function execFile(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, execOptions) as string;
  } catch (err: unknown) {
    const error = err as { stderr?: string; message: string };
    throw new Error(error.stderr || error.message);
  }
}

export function checkFoundryInstalled(): boolean {
  try {
    execFile("forge", ["--version"]);
    return true;
  } catch {
    return false;
  }
}

export function deployWithFoundry(params: {
  contractPath: string;
  constructorArgs?: string[];
  broadcast?: boolean;
}): string {
  const rpcUrl = getRpcUrl();
  const privateKey = requirePrivateKey();

  const args = ["create", params.contractPath, "--rpc-url", rpcUrl, "--private-key", privateKey];

  if (params.broadcast !== false) {
    args.push("--broadcast");
  }

  if (params.constructorArgs && params.constructorArgs.length > 0) {
    args.push("--constructor-args", ...params.constructorArgs);
  }

  return execFile("forge", args);
}

export function verifyContract(params: {
  address: string;
  contractPath: string;
  constructorArgs?: string[];
}): string {
  const rpcUrl = getRpcUrl();

  const args = [
    "verify-contract",
    params.address,
    params.contractPath,
    "--rpc-url",
    rpcUrl,
    "--verifier",
    "blockscout",
    "--verifier-url",
    "https://testnet.arcscan.app/api/",
  ];

  if (params.constructorArgs && params.constructorArgs.length > 0) {
    args.push("--constructor-args", ...params.constructorArgs);
  }

  return execFile("forge", args);
}

export function castCall(params: {
  contractAddress: string;
  functionSignature: string;
  args?: string[];
}): string {
  const rpcUrl = getRpcUrl();

  const args = ["call", params.contractAddress, params.functionSignature, "--rpc-url", rpcUrl];

  if (params.args && params.args.length > 0) {
    args.push(...params.args);
  }

  return execFile("cast", args);
}

export function castSend(params: {
  contractAddress: string;
  functionSignature: string;
  args?: string[];
  value?: string;
}): string {
  const rpcUrl = getRpcUrl();
  const privateKey = requirePrivateKey();

  const args = [
    "send",
    params.contractAddress,
    params.functionSignature,
    "--rpc-url",
    rpcUrl,
    "--private-key",
    privateKey,
  ];

  if (params.args && params.args.length > 0) {
    args.push(...params.args);
  }

  if (params.value) {
    args.push("--value", params.value);
  }

  return execFile("cast", args);
}

export function castWalletNew(): string {
  return execFile("cast", ["wallet", "new"]);
}

export function castDecodeTransaction(data: string): string {
  return execFile("cast", ["4byte-decode", data]);
}
