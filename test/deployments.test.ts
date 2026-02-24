import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, unlinkSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  loadDeployments,
  saveDeployment,
  updateDeployment,
  getDeployment,
} from "../src/services/deployments.js";

const TEST_DEPLOYMENTS_PATH = resolve(process.cwd(), "deployments.json");
let originalContent: string | null = null;

function createTestDeployment(overrides = {}) {
  return {
    name: "TestToken",
    symbol: "TT",
    address: "0x1234567890123456789012345678901234567890",
    deployer: "0xaabbccddee11223344556677889900aabbccddee",
    txHash: "0x" + "ab".repeat(32),
    supply: "1000",
    decimals: 18,
    network: "Arc Testnet",
    solFile: "SimpleToken.sol",
    verified: false,
    deployedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  if (existsSync(TEST_DEPLOYMENTS_PATH)) {
    originalContent = readFileSync(TEST_DEPLOYMENTS_PATH, "utf-8");
  }
});

afterEach(() => {
  if (originalContent !== null) {
    const { writeFileSync } = require("fs");
    writeFileSync(TEST_DEPLOYMENTS_PATH, originalContent);
    originalContent = null;
  }
});

describe("loadDeployments", () => {
  it("returns existing deployments", () => {
    const deployments = loadDeployments();
    expect(Array.isArray(deployments)).toBe(true);
  });
});

describe("saveDeployment", () => {
  it("adds deployment to the list", () => {
    const before = loadDeployments();
    const deployment = createTestDeployment({ address: "0x" + "ff".repeat(20) });
    saveDeployment(deployment);
    const after = loadDeployments();
    expect(after.length).toBe(before.length + 1);
    expect(after[after.length - 1].address).toBe(deployment.address);
  });
});

describe("getDeployment", () => {
  it("finds deployment by address (case insensitive)", () => {
    const deployments = loadDeployments();
    if (deployments.length > 0) {
      const first = deployments[0];
      const found = getDeployment(first.address.toLowerCase());
      expect(found).toBeDefined();
      expect(found!.name).toBe(first.name);
    }
  });

  it("returns undefined for non-existent address", () => {
    const result = getDeployment("0x0000000000000000000000000000000000000000");
    expect(result).toBeUndefined();
  });
});

describe("updateDeployment", () => {
  it("updates an existing deployment", () => {
    const deployments = loadDeployments();
    if (deployments.length > 0) {
      const first = deployments[0];
      const wasVerified = first.verified;
      updateDeployment(first.address, { verified: !wasVerified });
      const updated = getDeployment(first.address);
      expect(updated!.verified).toBe(!wasVerified);
      // Restore
      updateDeployment(first.address, { verified: wasVerified });
    }
  });

  it("returns false for non-existent address", () => {
    const result = updateDeployment("0x0000000000000000000000000000000000000000", { verified: true });
    expect(result).toBe(false);
  });
});
