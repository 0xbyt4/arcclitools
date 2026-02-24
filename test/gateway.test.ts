import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock Circle SDK ---

const mockClient = {
  createContractExecutionTransaction: vi.fn(),
  createTransaction: vi.fn(),
  getWalletTokenBalance: vi.fn(),
};

vi.mock("@circle-fin/developer-controlled-wallets", () => ({
  initiateDeveloperControlledWalletsClient: vi.fn(() => mockClient),
}));

vi.mock("../src/config/env.js", () => ({
  requireApiKey: vi.fn(() => "test-api-key"),
  requireEntitySecret: vi.fn(() => "test-entity-secret"),
}));

import {
  depositToGateway,
  transferViaGateway,
  getGatewayBalance,
} from "../src/services/gateway.js";
import { ARC_TESTNET } from "../src/config/constants.js";

// --- depositToGateway ---

describe("depositToGateway", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls contract execution with GatewayWallet address", async () => {
    const txData = { id: "tx-gw-1", state: "INITIATED" };
    mockClient.createContractExecutionTransaction.mockResolvedValue({ data: txData });

    const result = await depositToGateway({ walletId: "w-1", amount: "100" });

    expect(mockClient.createContractExecutionTransaction).toHaveBeenCalledWith({
      walletId: "w-1",
      contractAddress: ARC_TESTNET.contracts.GatewayWallet.address,
      abiFunctionSignature: "deposit(uint256)",
      abiParameters: ["100"],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    expect(result).toEqual(txData);
  });

  it("uses the correct Gateway contract address", async () => {
    mockClient.createContractExecutionTransaction.mockResolvedValue({ data: {} });

    await depositToGateway({ walletId: "w-1", amount: "50" });

    const call = mockClient.createContractExecutionTransaction.mock.calls[0][0];
    expect(call.contractAddress).toBe("0x0077777d7EBA4688BDeF3E311b846F25870A19B9");
  });

  it("passes amount as ABI parameter", async () => {
    mockClient.createContractExecutionTransaction.mockResolvedValue({ data: {} });

    await depositToGateway({ walletId: "w-1", amount: "250.5" });

    const call = mockClient.createContractExecutionTransaction.mock.calls[0][0];
    expect(call.abiParameters).toEqual(["250.5"]);
  });

  it("uses MEDIUM fee level", async () => {
    mockClient.createContractExecutionTransaction.mockResolvedValue({ data: {} });

    await depositToGateway({ walletId: "w-1", amount: "10" });

    const call = mockClient.createContractExecutionTransaction.mock.calls[0][0];
    expect(call.fee).toEqual({ type: "level", config: { feeLevel: "MEDIUM" } });
  });

  it("propagates errors", async () => {
    mockClient.createContractExecutionTransaction.mockRejectedValue(
      new Error("Gateway deposit failed")
    );

    await expect(depositToGateway({ walletId: "w-1", amount: "100" })).rejects.toThrow(
      "Gateway deposit failed"
    );
  });
});

// --- transferViaGateway ---

describe("transferViaGateway", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls createTransaction with correct params", async () => {
    const txData = { id: "tx-gw-t1", state: "INITIATED" };
    mockClient.createTransaction.mockResolvedValue({ data: txData });

    const result = await transferViaGateway({
      walletId: "w-1",
      destinationAddress: "0xdest",
      destinationBlockchain: "ETH-SEPOLIA",
      amount: "75",
    });

    expect(mockClient.createTransaction).toHaveBeenCalledWith({
      amount: ["75"],
      destinationAddress: "0xdest",
      tokenAddress: ARC_TESTNET.contracts.USDC.address,
      blockchain: "ETH-SEPOLIA",
      walletAddress: "0xdest",
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    expect(result).toEqual(txData);
  });

  it("uses USDC token address", async () => {
    mockClient.createTransaction.mockResolvedValue({ data: {} });

    await transferViaGateway({
      walletId: "w-1",
      destinationAddress: "0xdest",
      destinationBlockchain: "BASE-SEPOLIA",
      amount: "10",
    });

    const call = mockClient.createTransaction.mock.calls[0][0];
    expect(call.tokenAddress).toBe(ARC_TESTNET.contracts.USDC.address);
  });

  it("sends amount as single-element array", async () => {
    mockClient.createTransaction.mockResolvedValue({ data: {} });

    await transferViaGateway({
      walletId: "w-1",
      destinationAddress: "0xdest",
      destinationBlockchain: "ETH-SEPOLIA",
      amount: "42",
    });

    const call = mockClient.createTransaction.mock.calls[0][0];
    expect(call.amount).toEqual(["42"]);
  });

  it("passes the destination blockchain", async () => {
    mockClient.createTransaction.mockResolvedValue({ data: {} });

    await transferViaGateway({
      walletId: "w-1",
      destinationAddress: "0xdest",
      destinationBlockchain: "ARC-TESTNET",
      amount: "10",
    });

    const call = mockClient.createTransaction.mock.calls[0][0];
    expect(call.blockchain).toBe("ARC-TESTNET");
  });

  it("propagates errors", async () => {
    mockClient.createTransaction.mockRejectedValue(new Error("Gateway transfer failed"));

    await expect(
      transferViaGateway({
        walletId: "w-1",
        destinationAddress: "0xdest",
        destinationBlockchain: "ETH-SEPOLIA",
        amount: "100",
      })
    ).rejects.toThrow("Gateway transfer failed");
  });
});

// --- getGatewayBalance ---

describe("getGatewayBalance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches token balances for wallet", async () => {
    const balances = [{ token: { symbol: "USDC", name: "USD Coin" }, amount: "500.00" }];
    mockClient.getWalletTokenBalance.mockResolvedValue({
      data: { tokenBalances: balances },
    });

    const result = await getGatewayBalance("w-1");

    expect(mockClient.getWalletTokenBalance).toHaveBeenCalledWith({ id: "w-1" });
    expect(result).toHaveLength(1);
    expect(result![0].amount).toBe("500.00");
  });

  it("returns multiple token balances", async () => {
    const balances = [
      { token: { symbol: "USDC" }, amount: "100" },
      { token: { symbol: "EURC" }, amount: "200" },
      { token: { symbol: "USYC" }, amount: "300" },
    ];
    mockClient.getWalletTokenBalance.mockResolvedValue({
      data: { tokenBalances: balances },
    });

    const result = await getGatewayBalance("w-multi");
    expect(result).toHaveLength(3);
  });

  it("returns undefined when no data", async () => {
    mockClient.getWalletTokenBalance.mockResolvedValue({ data: undefined });

    const result = await getGatewayBalance("w-empty");
    expect(result).toBeUndefined();
  });

  it("returns empty array when no balances", async () => {
    mockClient.getWalletTokenBalance.mockResolvedValue({
      data: { tokenBalances: [] },
    });

    const result = await getGatewayBalance("w-zero");
    expect(result).toEqual([]);
  });

  it("propagates errors", async () => {
    mockClient.getWalletTokenBalance.mockRejectedValue(new Error("Wallet not found"));

    await expect(getGatewayBalance("w-invalid")).rejects.toThrow("Wallet not found");
  });
});
