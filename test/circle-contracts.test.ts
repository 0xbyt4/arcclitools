import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock Circle Smart Contract Platform SDK ---

const mockClient = {
  deployContractTemplate: vi.fn(),
  deployContract: vi.fn(),
  importContract: vi.fn(),
  getContract: vi.fn(),
  createEventMonitor: vi.fn(),
  listEventLogs: vi.fn(),
};

vi.mock("@circle-fin/smart-contract-platform", () => ({
  initiateSmartContractPlatformClient: vi.fn(() => mockClient),
}));

vi.mock("../src/config/env.js", () => ({
  requireApiKey: vi.fn(() => "test-api-key"),
  requireEntitySecret: vi.fn(() => "test-entity-secret"),
}));

import {
  deployTemplate,
  deployContract,
  importContract,
  getContract,
  createEventMonitor,
  listEventLogs,
} from "../src/services/circle-contracts.js";
import { ARC_BLOCKCHAIN_ID } from "../src/config/constants.js";

// --- deployTemplate ---

describe("deployTemplate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deploys ERC20 template with correct params", async () => {
    const txData = { id: "ct-1", state: "INITIATED" };
    mockClient.deployContractTemplate.mockResolvedValue({ data: txData });

    const result = await deployTemplate({
      walletId: "w-1",
      template: "erc20",
      name: "My Token",
      symbol: "MTK",
    });

    expect(mockClient.deployContractTemplate).toHaveBeenCalledWith({
      id: "ERC20",
      blockchain: ARC_BLOCKCHAIN_ID,
      walletId: "w-1",
      name: "My Token",
      templateParameters: { symbol: "MTK" },
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    expect(result).toEqual(txData);
  });

  it("deploys ERC721 template", async () => {
    mockClient.deployContractTemplate.mockResolvedValue({ data: {} });

    await deployTemplate({
      walletId: "w-1",
      template: "erc721",
      name: "My NFT",
      baseUri: "https://api.example.com/metadata/",
    });

    const call = mockClient.deployContractTemplate.mock.calls[0][0];
    expect(call.id).toBe("ERC721");
    expect(call.templateParameters.baseUri).toBe("https://api.example.com/metadata/");
  });

  it("deploys with no optional params", async () => {
    mockClient.deployContractTemplate.mockResolvedValue({ data: {} });

    await deployTemplate({
      walletId: "w-1",
      template: "erc1155",
      name: "Multi Token",
    });

    const call = mockClient.deployContractTemplate.mock.calls[0][0];
    expect(call.id).toBe("ERC1155");
    expect(call.templateParameters).toEqual({});
  });

  it("maps airdrop template correctly", async () => {
    mockClient.deployContractTemplate.mockResolvedValue({ data: {} });

    await deployTemplate({
      walletId: "w-1",
      template: "airdrop",
      name: "Airdrop",
    });

    const call = mockClient.deployContractTemplate.mock.calls[0][0];
    expect(call.id).toBe("Airdrop");
  });

  it("propagates errors", async () => {
    mockClient.deployContractTemplate.mockRejectedValue(new Error("Template not found"));

    await expect(
      deployTemplate({ walletId: "w-1", template: "erc20", name: "Fail" })
    ).rejects.toThrow("Template not found");
  });
});

// --- deployContract ---

describe("deployContract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deploys custom contract with ABI and bytecode", async () => {
    const txData = { id: "ct-2", state: "INITIATED" };
    mockClient.deployContract.mockResolvedValue({ data: txData });

    const result = await deployContract({
      walletId: "w-1",
      name: "CustomToken",
      abiJson: '[{"type":"constructor"}]',
      bytecode: "0x60806040",
      constructorArgs: ["arg1", 100],
    });

    expect(mockClient.deployContract).toHaveBeenCalledWith({
      walletId: "w-1",
      blockchain: ARC_BLOCKCHAIN_ID,
      name: "CustomToken",
      abiJson: '[{"type":"constructor"}]',
      bytecode: "0x60806040",
      constructorParameters: ["arg1", 100],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    expect(result).toEqual(txData);
  });

  it("deploys without constructor args", async () => {
    mockClient.deployContract.mockResolvedValue({ data: {} });

    await deployContract({
      walletId: "w-1",
      name: "NoArgs",
      abiJson: "[]",
      bytecode: "0x00",
    });

    const call = mockClient.deployContract.mock.calls[0][0];
    expect(call.constructorParameters).toBeUndefined();
  });

  it("always uses ARC blockchain", async () => {
    mockClient.deployContract.mockResolvedValue({ data: {} });

    await deployContract({
      walletId: "w-1",
      name: "Test",
      abiJson: "[]",
      bytecode: "0x00",
    });

    expect(mockClient.deployContract.mock.calls[0][0].blockchain).toBe("ARC-TESTNET");
  });
});

// --- importContract ---

describe("importContract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("imports contract by address", async () => {
    const contractData = { id: "imp-1", address: "0xcontract" };
    mockClient.importContract.mockResolvedValue({ data: contractData });

    const result = await importContract({
      address: "0xcontract",
      name: "Imported",
    });

    expect(mockClient.importContract).toHaveBeenCalledWith({
      blockchain: ARC_BLOCKCHAIN_ID,
      address: "0xcontract",
      name: "Imported",
    });
    expect(result).toEqual(contractData);
  });
});

// --- getContract ---

describe("getContract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches contract by ID", async () => {
    const contractData = { id: "ct-1", name: "MyContract", address: "0xabc" };
    mockClient.getContract.mockResolvedValue({ data: contractData });

    const result = await getContract("ct-1");

    expect(mockClient.getContract).toHaveBeenCalledWith({ id: "ct-1" });
    expect(result).toEqual(contractData);
  });

  it("returns undefined for non-existent contract", async () => {
    mockClient.getContract.mockResolvedValue({ data: undefined });

    const result = await getContract("ct-999");
    expect(result).toBeUndefined();
  });
});

// --- createEventMonitor ---

describe("createEventMonitor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates monitor with contract address and event signature", async () => {
    const monitorData = { id: "mon-1" };
    mockClient.createEventMonitor.mockResolvedValue({ data: monitorData });

    const result = await createEventMonitor({
      contractAddress: "0xcontract",
      eventSignature: "Transfer(address,address,uint256)",
    });

    expect(mockClient.createEventMonitor).toHaveBeenCalledWith({
      blockchain: ARC_BLOCKCHAIN_ID,
      contractAddress: "0xcontract",
      eventSignature: "Transfer(address,address,uint256)",
    });
    expect(result).toEqual(monitorData);
  });
});

// --- listEventLogs ---

describe("listEventLogs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists event logs with default page size", async () => {
    const logsData = { eventLogs: [{ event: "Transfer" }] };
    mockClient.listEventLogs.mockResolvedValue({ data: logsData });

    const result = await listEventLogs({ contractAddress: "0xcontract" });

    expect(mockClient.listEventLogs).toHaveBeenCalledWith({
      contractAddress: "0xcontract",
      blockchain: ARC_BLOCKCHAIN_ID,
      pageSize: 20,
    });
    expect(result).toEqual(logsData);
  });

  it("uses custom page size", async () => {
    mockClient.listEventLogs.mockResolvedValue({ data: { eventLogs: [] } });

    await listEventLogs({ contractAddress: "0xcontract", pageSize: 50 });

    expect(mockClient.listEventLogs.mock.calls[0][0].pageSize).toBe(50);
  });
});
