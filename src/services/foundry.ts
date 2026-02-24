import { execSync, type ExecSyncOptions } from "child_process";
import { getRpcUrl, requirePrivateKey } from "../config/env.js";

const execOptions: ExecSyncOptions = {
  encoding: "utf-8",
  stdio: ["pipe", "pipe", "pipe"],
  timeout: 120000,
};

function exec(command: string): string {
  try {
    return execSync(command, execOptions) as string;
  } catch (err: unknown) {
    const error = err as { stderr?: string; message: string };
    throw new Error(error.stderr || error.message);
  }
}

export function checkFoundryInstalled(): boolean {
  try {
    exec("forge --version");
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

  let cmd = `forge create ${params.contractPath} --rpc-url ${rpcUrl} --private-key ${privateKey}`;

  if (params.broadcast !== false) {
    cmd += " --broadcast";
  }

  if (params.constructorArgs && params.constructorArgs.length > 0) {
    cmd += ` --constructor-args ${params.constructorArgs.join(" ")}`;
  }

  return exec(cmd);
}

export function verifyContract(params: {
  address: string;
  contractPath: string;
  constructorArgs?: string[];
}): string {
  const rpcUrl = getRpcUrl();

  let cmd = `forge verify-contract ${params.address} ${params.contractPath} --rpc-url ${rpcUrl} --verifier blockscout --verifier-url https://testnet.arcscan.app/api/`;

  if (params.constructorArgs && params.constructorArgs.length > 0) {
    cmd += ` --constructor-args ${params.constructorArgs.join(" ")}`;
  }

  return exec(cmd);
}

export function castCall(params: {
  contractAddress: string;
  functionSignature: string;
  args?: string[];
}): string {
  const rpcUrl = getRpcUrl();

  let cmd = `cast call ${params.contractAddress} "${params.functionSignature}" --rpc-url ${rpcUrl}`;

  if (params.args && params.args.length > 0) {
    cmd += ` ${params.args.join(" ")}`;
  }

  return exec(cmd);
}

export function castSend(params: {
  contractAddress: string;
  functionSignature: string;
  args?: string[];
  value?: string;
}): string {
  const rpcUrl = getRpcUrl();
  const privateKey = requirePrivateKey();

  let cmd = `cast send ${params.contractAddress} "${params.functionSignature}" --rpc-url ${rpcUrl} --private-key ${privateKey}`;

  if (params.args && params.args.length > 0) {
    cmd += ` ${params.args.join(" ")}`;
  }

  if (params.value) {
    cmd += ` --value ${params.value}`;
  }

  return exec(cmd);
}

export function castWalletNew(): string {
  return exec("cast wallet new");
}

export function castDecodeTransaction(data: string): string {
  return exec(`cast 4byte-decode ${data}`);
}
