import { describe, it, expect } from "vitest";
import { ARC_TESTNET, NATIVE_USDC_DECIMALS, EVM_DIFFERENCES, PROVIDERS } from "../src/config/constants.js";

describe("ARC_TESTNET", () => {
  it("has correct chain ID", () => {
    expect(ARC_TESTNET.chainId).toBe(5042002);
  });

  it("has valid RPC URL", () => {
    expect(ARC_TESTNET.rpcUrl).toMatch(/^https:\/\//);
  });

  it("has valid explorer URL", () => {
    expect(ARC_TESTNET.explorer).toMatch(/^https:\/\//);
  });

  it("has CCTP domain 26", () => {
    expect(ARC_TESTNET.cctpDomain).toBe(26);
  });

  it("has USDC contract address", () => {
    expect(ARC_TESTNET.contracts.USDC.address).toMatch(/^0x/);
    expect(ARC_TESTNET.contracts.USDC.decimals).toBe(6);
  });

  it("has EURC contract address", () => {
    expect(ARC_TESTNET.contracts.EURC.address).toMatch(/^0x/);
    expect(ARC_TESTNET.contracts.EURC.decimals).toBe(6);
  });

  it("has USYC contract address", () => {
    expect(ARC_TESTNET.contracts.USYC.address).toMatch(/^0x/);
  });

  it("has all CCTP contracts", () => {
    expect(ARC_TESTNET.contracts.TokenMessengerV2).toBeDefined();
    expect(ARC_TESTNET.contracts.MessageTransmitterV2).toBeDefined();
    expect(ARC_TESTNET.contracts.TokenMinterV2).toBeDefined();
  });

  it("has infrastructure contracts", () => {
    expect(ARC_TESTNET.contracts.Multicall3).toBeDefined();
    expect(ARC_TESTNET.contracts.Permit2).toBeDefined();
    expect(ARC_TESTNET.contracts.CREATE2Factory).toBeDefined();
  });

  it("all contract addresses start with 0x", () => {
    for (const [name, contract] of Object.entries(ARC_TESTNET.contracts)) {
      expect(contract.address, `${name} should start with 0x`).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });
});

describe("NATIVE_USDC_DECIMALS", () => {
  it("is 18 (native gas token decimals)", () => {
    expect(NATIVE_USDC_DECIMALS).toBe(18);
  });
});

describe("EVM_DIFFERENCES", () => {
  it("is non-empty array", () => {
    expect(EVM_DIFFERENCES.length).toBeGreaterThan(0);
  });

  it("each entry has required fields", () => {
    for (const diff of EVM_DIFFERENCES) {
      expect(diff.area).toBeDefined();
      expect(diff.arc).toBeDefined();
      expect(diff.ethereum).toBeDefined();
    }
  });
});

describe("PROVIDERS", () => {
  it("is non-empty array", () => {
    expect(PROVIDERS.length).toBeGreaterThan(0);
  });

  it("each provider has required fields", () => {
    for (const provider of PROVIDERS) {
      expect(provider.name).toBeDefined();
      expect(provider.url).toMatch(/^https:\/\//);
      expect(provider.description).toBeDefined();
      expect(provider.category).toBeDefined();
    }
  });

  it("has providers in different categories", () => {
    const categories = new Set(PROVIDERS.map((p) => p.category));
    expect(categories.size).toBeGreaterThan(1);
  });
});
