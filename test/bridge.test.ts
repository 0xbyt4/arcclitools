import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock Bridge Kit and adapter ---

const mockBridge = vi.fn();

vi.mock("@circle-fin/bridge-kit", () => {
  return {
    BridgeKit: class MockBridgeKit {
      bridge = mockBridge;
    },
  };
});

vi.mock("@circle-fin/adapter-circle-wallets", () => ({
  createCircleWalletsAdapter: vi.fn(() => ({ type: "mock-adapter" })),
}));

vi.mock("../src/config/env.js", () => ({
  requireApiKey: vi.fn(() => "test-api-key"),
  requireEntitySecret: vi.fn(() => "test-entity-secret"),
}));

import {
  getSupportedChains,
  bridgeToArc,
  bridgeFromArc,
} from "../src/services/bridge.js";

// --- getSupportedChains ---

describe("getSupportedChains", () => {
  it("returns an array of supported chains", () => {
    const chains = getSupportedChains();
    expect(Array.isArray(chains)).toBe(true);
    expect(chains.length).toBeGreaterThan(0);
  });

  it("includes Arc_Testnet", () => {
    expect(getSupportedChains()).toContain("Arc_Testnet");
  });

  it("includes Ethereum_Sepolia", () => {
    expect(getSupportedChains()).toContain("Ethereum_Sepolia");
  });

  it("includes Base_Sepolia", () => {
    expect(getSupportedChains()).toContain("Base_Sepolia");
  });

  it("includes at least 5 chains", () => {
    expect(getSupportedChains().length).toBeGreaterThanOrEqual(5);
  });

  it("returns readonly array", () => {
    const chains = getSupportedChains();
    // Verify it returns the same reference each time (frozen array)
    expect(chains).toBe(getSupportedChains());
  });
});

// --- bridgeToArc ---

describe("bridgeToArc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls BridgeKit.bridge with Arc_Testnet as destination", async () => {
    const bridgeResult = { txHash: "0xbridge123", status: "PENDING" };
    mockBridge.mockResolvedValue(bridgeResult);

    const result = await bridgeToArc({
      sourceChain: "Ethereum_Sepolia",
      sourceAddress: "0xsource",
      destinationAddress: "0xdest",
      amount: "100",
    });

    expect(mockBridge).toHaveBeenCalledTimes(1);
    const call = mockBridge.mock.calls[0][0];
    expect(call.from.chain).toBe("Ethereum_Sepolia");
    expect(call.from.address).toBe("0xsource");
    expect(call.to.chain).toBe("Arc_Testnet");
    expect(call.to.address).toBe("0xdest");
    expect(call.amount).toBe("100");
    expect(result).toEqual(bridgeResult);
  });

  it("uses adapter for both from and to", async () => {
    mockBridge.mockResolvedValue({});

    await bridgeToArc({
      sourceChain: "Base_Sepolia",
      sourceAddress: "0xa",
      destinationAddress: "0xb",
      amount: "50",
    });

    const call = mockBridge.mock.calls[0][0];
    expect(call.from.adapter).toBeDefined();
    expect(call.to.adapter).toBeDefined();
  });

  it("works with different source chains", async () => {
    mockBridge.mockResolvedValue({});

    const chains = ["Arbitrum_Sepolia", "Avalanche_Fuji", "Optimism_Sepolia"] as const;
    for (const chain of chains) {
      await bridgeToArc({
        sourceChain: chain,
        sourceAddress: "0xa",
        destinationAddress: "0xb",
        amount: "10",
      });
    }

    expect(mockBridge).toHaveBeenCalledTimes(3);
    expect(mockBridge.mock.calls[0][0].from.chain).toBe("Arbitrum_Sepolia");
    expect(mockBridge.mock.calls[1][0].from.chain).toBe("Avalanche_Fuji");
    expect(mockBridge.mock.calls[2][0].from.chain).toBe("Optimism_Sepolia");
  });

  it("propagates bridge errors", async () => {
    mockBridge.mockRejectedValue(new Error("Bridge attestation failed"));

    await expect(
      bridgeToArc({
        sourceChain: "Ethereum_Sepolia",
        sourceAddress: "0xa",
        destinationAddress: "0xb",
        amount: "10",
      })
    ).rejects.toThrow("Bridge attestation failed");
  });
});

// --- bridgeFromArc ---

describe("bridgeFromArc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls BridgeKit.bridge with Arc_Testnet as source", async () => {
    const bridgeResult = { txHash: "0xbridge456", status: "PENDING" };
    mockBridge.mockResolvedValue(bridgeResult);

    const result = await bridgeFromArc({
      destinationChain: "Base_Sepolia",
      sourceAddress: "0xarcwallet",
      destinationAddress: "0xbasewallet",
      amount: "25",
    });

    expect(mockBridge).toHaveBeenCalledTimes(1);
    const call = mockBridge.mock.calls[0][0];
    expect(call.from.chain).toBe("Arc_Testnet");
    expect(call.from.address).toBe("0xarcwallet");
    expect(call.to.chain).toBe("Base_Sepolia");
    expect(call.to.address).toBe("0xbasewallet");
    expect(call.amount).toBe("25");
    expect(result).toEqual(bridgeResult);
  });

  it("always uses Arc_Testnet as source chain", async () => {
    mockBridge.mockResolvedValue({});

    await bridgeFromArc({
      destinationChain: "Polygon_Amoy_Testnet",
      sourceAddress: "0xa",
      destinationAddress: "0xb",
      amount: "5",
    });

    const call = mockBridge.mock.calls[0][0];
    expect(call.from.chain).toBe("Arc_Testnet");
  });

  it("works with different destination chains", async () => {
    mockBridge.mockResolvedValue({});

    const chains = ["Ethereum_Sepolia", "Base_Sepolia", "Unichain_Sepolia"] as const;
    for (const chain of chains) {
      await bridgeFromArc({
        destinationChain: chain,
        sourceAddress: "0xa",
        destinationAddress: "0xb",
        amount: "10",
      });
    }

    expect(mockBridge).toHaveBeenCalledTimes(3);
    expect(mockBridge.mock.calls[0][0].to.chain).toBe("Ethereum_Sepolia");
    expect(mockBridge.mock.calls[1][0].to.chain).toBe("Base_Sepolia");
    expect(mockBridge.mock.calls[2][0].to.chain).toBe("Unichain_Sepolia");
  });

  it("propagates bridge errors", async () => {
    mockBridge.mockRejectedValue(new Error("Insufficient USDC balance on Arc"));

    await expect(
      bridgeFromArc({
        destinationChain: "Ethereum_Sepolia",
        sourceAddress: "0xa",
        destinationAddress: "0xb",
        amount: "999999",
      })
    ).rejects.toThrow("Insufficient USDC balance on Arc");
  });
});
