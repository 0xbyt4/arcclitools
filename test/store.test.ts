import { describe, it, expect, beforeEach } from "vitest";
import {
  getConfig,
  setConfig,
  getAllConfig,
  resetConfig,
  getConfigPath,
  hasConfig,
} from "../src/config/store.js";

describe("config store", () => {
  beforeEach(() => {
    resetConfig();
  });

  // --- setConfig / getConfig ---

  describe("setConfig / getConfig", () => {
    it("stores and retrieves a string value", () => {
      setConfig("apiKey", "test-api-key-123");
      expect(getConfig("apiKey")).toBe("test-api-key-123");
    });

    it("stores and retrieves a number value", () => {
      setConfig("x402Port", 4000);
      expect(getConfig("x402Port")).toBe(4000);
    });

    it("overwrites existing value", () => {
      setConfig("rpcUrl", "https://first.com");
      setConfig("rpcUrl", "https://second.com");
      expect(getConfig("rpcUrl")).toBe("https://second.com");
    });

    it("returns undefined for unset key", () => {
      expect(getConfig("apiKey")).toBeUndefined();
    });

    it("stores each key independently", () => {
      setConfig("apiKey", "key-1");
      setConfig("entitySecret", "secret-1");
      expect(getConfig("apiKey")).toBe("key-1");
      expect(getConfig("entitySecret")).toBe("secret-1");
    });
  });

  // --- hasConfig ---

  describe("hasConfig", () => {
    it("returns false for unset key", () => {
      expect(hasConfig("apiKey")).toBe(false);
    });

    it("returns true for set key", () => {
      setConfig("apiKey", "exists");
      expect(hasConfig("apiKey")).toBe(true);
    });

    it("returns false after reset", () => {
      setConfig("apiKey", "exists");
      resetConfig();
      expect(hasConfig("apiKey")).toBe(false);
    });
  });

  // --- getAllConfig ---

  describe("getAllConfig", () => {
    it("returns empty object when nothing set", () => {
      const all = getAllConfig();
      expect(Object.keys(all).length).toBe(0);
    });

    it("returns all set values", () => {
      setConfig("apiKey", "k1");
      setConfig("x402Port", 5000);
      setConfig("rpcUrl", "https://rpc.test");

      const all = getAllConfig();
      expect(all.apiKey).toBe("k1");
      expect(all.x402Port).toBe(5000);
      expect(all.rpcUrl).toBe("https://rpc.test");
    });

    it("only includes set keys", () => {
      setConfig("apiKey", "only-this");
      const all = getAllConfig();
      expect(Object.keys(all)).toEqual(["apiKey"]);
    });
  });

  // --- resetConfig ---

  describe("resetConfig", () => {
    it("clears all values", () => {
      setConfig("apiKey", "key");
      setConfig("entitySecret", "secret");
      setConfig("rpcUrl", "https://rpc.test");

      resetConfig();

      expect(getConfig("apiKey")).toBeUndefined();
      expect(getConfig("entitySecret")).toBeUndefined();
      expect(getConfig("rpcUrl")).toBeUndefined();
    });

    it("is safe to call on empty store", () => {
      expect(() => resetConfig()).not.toThrow();
    });
  });

  // --- getConfigPath ---

  describe("getConfigPath", () => {
    it("returns a file path string", () => {
      const path = getConfigPath();
      expect(typeof path).toBe("string");
      expect(path.length).toBeGreaterThan(0);
    });

    it("path contains project name", () => {
      const path = getConfigPath();
      expect(path).toContain("arc-cli");
    });
  });
});
