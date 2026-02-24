import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mock store.ts ---

const mockStore: Record<string, unknown> = {};

vi.mock("../src/config/store.js", () => ({
  getConfig: vi.fn((key: string) => mockStore[key]),
}));

// Need to mock dotenv before importing env.ts
vi.mock("dotenv", () => ({
  default: { config: vi.fn() },
}));

import {
  getApiKey,
  getEntitySecret,
  getRpcUrl,
  getPrivateKey,
  getPinataJWT,
  requireApiKey,
  requireEntitySecret,
  requirePrivateKey,
  requirePinataJWT,
  getX402Port,
  getX402Price,
} from "../src/config/env.js";

describe("env config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear all mock store values
    for (const key of Object.keys(mockStore)) {
      delete mockStore[key];
    }
    // Reset process.env to a clean copy
    process.env = { ...originalEnv };
    delete process.env.CIRCLE_API_KEY;
    delete process.env.CIRCLE_ENTITY_SECRET;
    delete process.env.ARC_RPC_URL;
    delete process.env.PRIVATE_KEY;
    delete process.env.PINATA_JWT;
    delete process.env.X402_PORT;
    delete process.env.X402_PRICE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // --- getApiKey ---

  describe("getApiKey", () => {
    it("returns config store value first", () => {
      mockStore.apiKey = "store-key";
      process.env.CIRCLE_API_KEY = "env-key";
      expect(getApiKey()).toBe("store-key");
    });

    it("falls back to env var", () => {
      process.env.CIRCLE_API_KEY = "env-key";
      expect(getApiKey()).toBe("env-key");
    });

    it("returns undefined when not set", () => {
      expect(getApiKey()).toBeUndefined();
    });
  });

  // --- getEntitySecret ---

  describe("getEntitySecret", () => {
    it("returns config store value first", () => {
      mockStore.entitySecret = "store-secret";
      expect(getEntitySecret()).toBe("store-secret");
    });

    it("falls back to env var", () => {
      process.env.CIRCLE_ENTITY_SECRET = "env-secret";
      expect(getEntitySecret()).toBe("env-secret");
    });

    it("returns undefined when not set", () => {
      expect(getEntitySecret()).toBeUndefined();
    });
  });

  // --- getRpcUrl ---

  describe("getRpcUrl", () => {
    it("returns config store value first", () => {
      mockStore.rpcUrl = "https://custom-rpc.com";
      expect(getRpcUrl()).toBe("https://custom-rpc.com");
    });

    it("falls back to env var", () => {
      process.env.ARC_RPC_URL = "https://env-rpc.com";
      expect(getRpcUrl()).toBe("https://env-rpc.com");
    });

    it("defaults to Arc testnet RPC", () => {
      expect(getRpcUrl()).toBe("https://rpc.testnet.arc.network");
    });
  });

  // --- getPrivateKey ---

  describe("getPrivateKey", () => {
    it("returns config store value first", () => {
      mockStore.privateKey = "0xabc";
      expect(getPrivateKey()).toBe("0xabc");
    });

    it("falls back to env var", () => {
      process.env.PRIVATE_KEY = "0xdef";
      expect(getPrivateKey()).toBe("0xdef");
    });

    it("returns undefined when not set", () => {
      expect(getPrivateKey()).toBeUndefined();
    });
  });

  // --- getPinataJWT ---

  describe("getPinataJWT", () => {
    it("returns config store value first", () => {
      mockStore.pinataJwt = "jwt-from-store";
      expect(getPinataJWT()).toBe("jwt-from-store");
    });

    it("falls back to env var", () => {
      process.env.PINATA_JWT = "jwt-from-env";
      expect(getPinataJWT()).toBe("jwt-from-env");
    });

    it("returns undefined when not set", () => {
      expect(getPinataJWT()).toBeUndefined();
    });
  });

  // --- requireApiKey ---

  describe("requireApiKey", () => {
    it("returns key when available", () => {
      mockStore.apiKey = "valid-key";
      expect(requireApiKey()).toBe("valid-key");
    });

    it("throws with helpful message when missing", () => {
      expect(() => requireApiKey()).toThrow("Circle API key not found");
      expect(() => requireApiKey()).toThrow("arc config set api-key");
    });
  });

  // --- requireEntitySecret ---

  describe("requireEntitySecret", () => {
    it("returns secret when available", () => {
      mockStore.entitySecret = "valid-secret";
      expect(requireEntitySecret()).toBe("valid-secret");
    });

    it("throws with helpful message when missing", () => {
      expect(() => requireEntitySecret()).toThrow("Circle entity secret not found");
      expect(() => requireEntitySecret()).toThrow("arc config set entity-secret");
    });
  });

  // --- requirePrivateKey ---

  describe("requirePrivateKey", () => {
    it("returns key when available", () => {
      mockStore.privateKey = "0xprivate";
      expect(requirePrivateKey()).toBe("0xprivate");
    });

    it("throws with helpful message when missing", () => {
      expect(() => requirePrivateKey()).toThrow("Private key not found");
      expect(() => requirePrivateKey()).toThrow("arc config set private-key");
    });
  });

  // --- requirePinataJWT ---

  describe("requirePinataJWT", () => {
    it("returns JWT when available", () => {
      mockStore.pinataJwt = "valid-jwt";
      expect(requirePinataJWT()).toBe("valid-jwt");
    });

    it("throws with helpful message when missing", () => {
      expect(() => requirePinataJWT()).toThrow("Pinata JWT not found");
      expect(() => requirePinataJWT()).toThrow("arc config set pinata-jwt");
    });
  });

  // --- getX402Port ---

  describe("getX402Port", () => {
    it("returns config store value first", () => {
      mockStore.x402Port = 4000;
      expect(getX402Port()).toBe(4000);
    });

    it("falls back to env var", () => {
      process.env.X402_PORT = "5000";
      expect(getX402Port()).toBe(5000);
    });

    it("defaults to 3000", () => {
      expect(getX402Port()).toBe(3000);
    });
  });

  // --- getX402Price ---

  describe("getX402Price", () => {
    it("returns config store value first", () => {
      mockStore.x402Price = "0.05";
      expect(getX402Price()).toBe("0.05");
    });

    it("falls back to env var", () => {
      process.env.X402_PRICE = "0.10";
      expect(getX402Price()).toBe("0.10");
    });

    it("defaults to 0.01", () => {
      expect(getX402Price()).toBe("0.01");
    });
  });
});
