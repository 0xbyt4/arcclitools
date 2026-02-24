import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock the Circle SDK ---

const mockClient = {
  createWalletSet: vi.fn(),
  createWallets: vi.fn(),
  listWallets: vi.fn(),
  getWalletTokenBalance: vi.fn(),
  createTransaction: vi.fn(),
  getTransaction: vi.fn(),
  requestTestnetTokens: vi.fn(),
  createContractExecutionTransaction: vi.fn(),
};

vi.mock("@circle-fin/developer-controlled-wallets", () => ({
  initiateDeveloperControlledWalletsClient: vi.fn(() => mockClient),
}));

vi.mock("../src/config/env.js", () => ({
  requireApiKey: vi.fn(() => "test-api-key"),
  requireEntitySecret: vi.fn(() => "test-entity-secret"),
}));

import {
  createWalletSet,
  createWallet,
  listWallets,
  getWalletBalance,
  createTransfer,
  getTransaction,
  requestTestnetTokens,
  executeContractCall,
} from "../src/services/circle-wallets.js";
import { ARC_BLOCKCHAIN_ID } from "../src/config/constants.js";

// --- createWalletSet ---

describe("createWalletSet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls SDK with wallet set name", async () => {
    mockClient.createWalletSet.mockResolvedValue({
      data: { walletSet: { id: "ws-123", name: "TestSet" } },
    });

    const result = await createWalletSet("TestSet");

    expect(mockClient.createWalletSet).toHaveBeenCalledWith({ name: "TestSet" });
    expect(result).toEqual({ id: "ws-123", name: "TestSet" });
  });

  it("returns undefined when response has no data", async () => {
    mockClient.createWalletSet.mockResolvedValue({ data: undefined });

    const result = await createWalletSet("Empty");
    expect(result).toBeUndefined();
  });

  it("propagates SDK errors", async () => {
    mockClient.createWalletSet.mockRejectedValue(new Error("API rate limit"));

    await expect(createWalletSet("Fail")).rejects.toThrow("API rate limit");
  });
});

// --- createWallet ---

describe("createWallet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates wallets with correct blockchain and count", async () => {
    const wallets = [{ id: "w-1", address: "0xabc" }];
    mockClient.createWallets.mockResolvedValue({ data: { wallets } });

    const result = await createWallet("ws-123", 2);

    expect(mockClient.createWallets).toHaveBeenCalledWith({
      blockchains: [ARC_BLOCKCHAIN_ID],
      count: 2,
      walletSetId: "ws-123",
    });
    expect(result).toEqual(wallets);
  });

  it("defaults count to 1", async () => {
    mockClient.createWallets.mockResolvedValue({ data: { wallets: [] } });

    await createWallet("ws-123");

    expect(mockClient.createWallets).toHaveBeenCalledWith(
      expect.objectContaining({ count: 1 })
    );
  });

  it("returns undefined when no data", async () => {
    mockClient.createWallets.mockResolvedValue({ data: undefined });

    const result = await createWallet("ws-123");
    expect(result).toBeUndefined();
  });
});

// --- listWallets ---

describe("listWallets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists wallets for ARC blockchain", async () => {
    const wallets = [
      { id: "w-1", address: "0xabc", blockchain: ARC_BLOCKCHAIN_ID },
      { id: "w-2", address: "0xdef", blockchain: ARC_BLOCKCHAIN_ID },
    ];
    mockClient.listWallets.mockResolvedValue({ data: { wallets } });

    const result = await listWallets();

    expect(mockClient.listWallets).toHaveBeenCalledWith({
      blockchain: ARC_BLOCKCHAIN_ID,
      pageSize: 10,
    });
    expect(result).toHaveLength(2);
  });

  it("uses custom page size", async () => {
    mockClient.listWallets.mockResolvedValue({ data: { wallets: [] } });

    await listWallets(25);

    expect(mockClient.listWallets).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 25 })
    );
  });

  it("returns undefined when no data", async () => {
    mockClient.listWallets.mockResolvedValue({ data: undefined });

    const result = await listWallets();
    expect(result).toBeUndefined();
  });
});

// --- getWalletBalance ---

describe("getWalletBalance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches token balances for wallet", async () => {
    const balances = [
      { token: { symbol: "USDC" }, amount: "100.00" },
      { token: { symbol: "EURC" }, amount: "50.00" },
    ];
    mockClient.getWalletTokenBalance.mockResolvedValue({
      data: { tokenBalances: balances },
    });

    const result = await getWalletBalance("w-1");

    expect(mockClient.getWalletTokenBalance).toHaveBeenCalledWith({ id: "w-1" });
    expect(result).toHaveLength(2);
    expect(result![0].token.symbol).toBe("USDC");
  });

  it("returns undefined when no data", async () => {
    mockClient.getWalletTokenBalance.mockResolvedValue({ data: undefined });

    const result = await getWalletBalance("w-999");
    expect(result).toBeUndefined();
  });
});

// --- createTransfer ---

describe("createTransfer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates transfer with correct params", async () => {
    const txData = { id: "tx-1", state: "INITIATED" };
    mockClient.createTransaction.mockResolvedValue({ data: txData });

    const result = await createTransfer({
      walletAddress: "0xsender",
      destinationAddress: "0xrecipient",
      amount: "10.5",
      tokenAddress: "0xUSDC",
    });

    expect(mockClient.createTransaction).toHaveBeenCalledWith({
      amount: ["10.5"],
      destinationAddress: "0xrecipient",
      tokenAddress: "0xUSDC",
      blockchain: ARC_BLOCKCHAIN_ID,
      walletAddress: "0xsender",
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    expect(result).toEqual(txData);
  });

  it("sends amount as single-element array", async () => {
    mockClient.createTransaction.mockResolvedValue({ data: {} });

    await createTransfer({
      walletAddress: "0xa",
      destinationAddress: "0xb",
      amount: "0.01",
      tokenAddress: "0xt",
    });

    const call = mockClient.createTransaction.mock.calls[0][0];
    expect(call.amount).toEqual(["0.01"]);
    expect(Array.isArray(call.amount)).toBe(true);
  });

  it("uses MEDIUM fee level", async () => {
    mockClient.createTransaction.mockResolvedValue({ data: {} });

    await createTransfer({
      walletAddress: "0xa",
      destinationAddress: "0xb",
      amount: "1",
      tokenAddress: "0xt",
    });

    const call = mockClient.createTransaction.mock.calls[0][0];
    expect(call.fee).toEqual({ type: "level", config: { feeLevel: "MEDIUM" } });
  });

  it("propagates SDK errors", async () => {
    mockClient.createTransaction.mockRejectedValue(new Error("Insufficient funds"));

    await expect(
      createTransfer({
        walletAddress: "0xa",
        destinationAddress: "0xb",
        amount: "999999",
        tokenAddress: "0xt",
      })
    ).rejects.toThrow("Insufficient funds");
  });
});

// --- getTransaction ---

describe("getTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches transaction by ID", async () => {
    const txData = {
      transaction: {
        id: "tx-1",
        state: "COMPLETE",
        txHash: "0xabc123",
        sourceAddress: "0xfrom",
        destinationAddress: "0xto",
      },
    };
    mockClient.getTransaction.mockResolvedValue({ data: txData });

    const result = await getTransaction("tx-1");

    expect(mockClient.getTransaction).toHaveBeenCalledWith({ id: "tx-1" });
    expect(result).toEqual(txData);
  });

  it("returns undefined for non-existent transaction", async () => {
    mockClient.getTransaction.mockResolvedValue({ data: undefined });

    const result = await getTransaction("tx-nonexistent");
    expect(result).toBeUndefined();
  });
});

// --- requestTestnetTokens ---

describe("requestTestnetTokens", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requests USDC tokens", async () => {
    mockClient.requestTestnetTokens.mockResolvedValue({ status: 200 });

    const result = await requestTestnetTokens({
      address: "0xaddr",
      usdc: true,
    });

    expect(mockClient.requestTestnetTokens).toHaveBeenCalledWith({
      address: "0xaddr",
      blockchain: "ARC-TESTNET",
      usdc: true,
      eurc: undefined,
      native: undefined,
    });
    expect(result).toBe(200);
  });

  it("requests multiple token types", async () => {
    mockClient.requestTestnetTokens.mockResolvedValue({ status: 200 });

    await requestTestnetTokens({
      address: "0xaddr",
      usdc: true,
      eurc: true,
      native: true,
    });

    expect(mockClient.requestTestnetTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        usdc: true,
        eurc: true,
        native: true,
      })
    );
  });

  it("uses ARC-TESTNET blockchain ID", async () => {
    mockClient.requestTestnetTokens.mockResolvedValue({ status: 200 });

    await requestTestnetTokens({ address: "0xaddr" });

    const call = mockClient.requestTestnetTokens.mock.calls[0][0];
    expect(call.blockchain).toBe("ARC-TESTNET");
  });
});

// --- executeContractCall ---

describe("executeContractCall", () => {
  beforeEach(() => vi.clearAllMocks());

  it("executes contract call with correct params", async () => {
    const txData = { id: "tx-c1", state: "INITIATED" };
    mockClient.createContractExecutionTransaction.mockResolvedValue({ data: txData });

    const result = await executeContractCall({
      walletId: "w-1",
      contractAddress: "0xcontract",
      abiFunctionSignature: "transfer(address,uint256)",
      abiParameters: ["0xrecipient", "1000000"],
    });

    expect(mockClient.createContractExecutionTransaction).toHaveBeenCalledWith({
      walletId: "w-1",
      contractAddress: "0xcontract",
      abiFunctionSignature: "transfer(address,uint256)",
      abiParameters: ["0xrecipient", "1000000"],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    expect(result).toEqual(txData);
  });

  it("uses MEDIUM fee level for contract calls", async () => {
    mockClient.createContractExecutionTransaction.mockResolvedValue({ data: {} });

    await executeContractCall({
      walletId: "w-1",
      contractAddress: "0xc",
      abiFunctionSignature: "foo()",
      abiParameters: [],
    });

    const call = mockClient.createContractExecutionTransaction.mock.calls[0][0];
    expect(call.fee.config.feeLevel).toBe("MEDIUM");
  });

  it("propagates contract execution errors", async () => {
    mockClient.createContractExecutionTransaction.mockRejectedValue(
      new Error("Contract execution reverted")
    );

    await expect(
      executeContractCall({
        walletId: "w-1",
        contractAddress: "0xc",
        abiFunctionSignature: "fail()",
        abiParameters: [],
      })
    ).rejects.toThrow("Contract execution reverted");
  });
});
