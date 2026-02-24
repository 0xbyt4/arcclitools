import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";
import { requireApiKey, requireEntitySecret } from "../config/env.js";
import { ARC_BLOCKCHAIN_ID } from "../config/constants.js";

function getClient() {
  return initiateSmartContractPlatformClient({
    apiKey: requireApiKey(),
    entitySecret: requireEntitySecret(),
  });
}

// Template IDs from Circle Contracts platform
const TEMPLATE_IDS: Record<string, string> = {
  erc20: "ERC20",
  erc721: "ERC721",
  erc1155: "ERC1155",
  airdrop: "Airdrop",
};

export async function deployTemplate(params: {
  walletId: string;
  template: "erc20" | "erc721" | "erc1155" | "airdrop";
  name: string;
  symbol?: string;
  baseUri?: string;
}) {
  const client = getClient();

  const templateParams: Record<string, string> = {};
  if (params.symbol) templateParams.symbol = params.symbol;
  if (params.baseUri) templateParams.baseUri = params.baseUri;

  const response = await client.deployContractTemplate({
    id: TEMPLATE_IDS[params.template],
    blockchain: ARC_BLOCKCHAIN_ID,
    walletId: params.walletId,
    name: params.name,
    templateParameters: templateParams,
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });

  return response.data;
}

export async function deployContract(params: {
  walletId: string;
  name: string;
  abiJson: string;
  bytecode: string;
  constructorArgs?: unknown[];
}) {
  const client = getClient();

  const response = await client.deployContract({
    walletId: params.walletId,
    blockchain: ARC_BLOCKCHAIN_ID,
    name: params.name,
    abiJson: params.abiJson,
    bytecode: params.bytecode,
    constructorParameters: params.constructorArgs,
    fee: {
      type: "level",
      config: { feeLevel: "MEDIUM" },
    },
  });

  return response.data;
}

export async function importContract(params: {
  address: string;
  name: string;
}) {
  const client = getClient();
  const response = await client.importContract({
    blockchain: ARC_BLOCKCHAIN_ID,
    address: params.address,
    name: params.name,
  });
  return response.data;
}

export async function getContract(contractId: string) {
  const client = getClient();
  const response = await client.getContract({ id: contractId });
  return response.data;
}

export async function createEventMonitor(params: {
  contractAddress: string;
  eventSignature: string;
}) {
  const client = getClient();
  const response = await client.createEventMonitor({
    blockchain: ARC_BLOCKCHAIN_ID,
    contractAddress: params.contractAddress,
    eventSignature: params.eventSignature,
  });
  return response.data;
}

export async function listEventLogs(params: {
  contractAddress: string;
  pageSize?: number;
}) {
  const client = getClient();
  const response = await client.listEventLogs({
    contractAddress: params.contractAddress,
    blockchain: ARC_BLOCKCHAIN_ID,
    pageSize: params.pageSize || 20,
  });
  return response.data;
}
