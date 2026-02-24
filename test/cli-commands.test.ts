import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createProgram } from "../src/index.js";
import { resetConfig, setConfig, getConfig } from "../src/config/store.js";

// Suppress all console output during tests
const consoleSpy = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

// Helper: run CLI command through Commander
async function runCLI(...args: string[]): Promise<{ exitCode: number | undefined }> {
  process.exitCode = undefined;

  const program = createProgram();
  program.exitOverride(); // Prevent process.exit on --help/errors
  program.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });

  try {
    await program.parseAsync(["node", "arc", ...args]);
  } catch {
    // Commander throws on exitOverride, we check exitCode instead
  }

  return { exitCode: process.exitCode as number | undefined };
}

// Helper: capture console.log output
function captureOutput(): string[] {
  const lines: string[] = [];
  consoleSpy.log.mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  });
  return lines;
}

describe("CLI commands - config", () => {
  beforeEach(() => {
    resetConfig();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  it("config set stores a value", async () => {
    await runCLI("config", "set", "rpc-url", "https://custom.rpc");
    expect(getConfig("rpcUrl")).toBe("https://custom.rpc");
  });

  it("config set + get round-trip", async () => {
    await runCLI("config", "set", "rpc-url", "https://test.rpc");

    const output = captureOutput();
    await runCLI("config", "get", "rpc-url");

    expect(output.some((line) => line.includes("https://test.rpc"))).toBe(true);
  });

  it("config set converts x402-port to number", async () => {
    await runCLI("config", "set", "x402-port", "5000");
    expect(getConfig("x402Port")).toBe(5000);
  });

  it("config set unknown key sets exitCode", async () => {
    const { exitCode } = await runCLI("config", "set", "nonexistent-key", "value");
    expect(exitCode).toBe(1);
  });

  it("config get unknown key sets exitCode", async () => {
    const { exitCode } = await runCLI("config", "get", "nonexistent-key");
    expect(exitCode).toBe(1);
  });

  it("config list shows set values", async () => {
    setConfig("rpcUrl", "https://listed.rpc");
    setConfig("x402Port", 4000);

    const output = captureOutput();
    await runCLI("config", "list");

    const combined = output.join("\n");
    expect(combined).toContain("rpcUrl");
  });

  it("config list warns when empty", async () => {
    const output = captureOutput();
    await runCLI("config", "list");

    const combined = output.join("\n");
    expect(combined).toContain("No configuration");
  });

  afterEach(() => {
    resetConfig();
  });
});

describe("CLI commands - network info", () => {
  beforeEach(() => {
    consoleSpy.log.mockClear();
  });

  it("network info runs without error", async () => {
    const { exitCode } = await runCLI("network", "info");
    expect(exitCode).toBeUndefined();
  });

  it("network info outputs chain details", async () => {
    const output = captureOutput();
    await runCLI("network", "info");

    const combined = output.join("\n");
    expect(combined).toContain("5042002"); // Chain ID
    expect(combined).toContain("rpc.testnet.arc.network"); // RPC URL
    expect(combined).toContain("arcscan.app"); // Explorer
  });
});

describe("CLI commands - addresses list", () => {
  beforeEach(() => {
    consoleSpy.log.mockClear();
  });

  it("addresses list runs without error", async () => {
    const { exitCode } = await runCLI("addresses", "list");
    expect(exitCode).toBeUndefined();
  });

  it("addresses list shows USDC contract", async () => {
    const output = captureOutput();
    await runCLI("addresses", "list");

    const combined = output.join("\n");
    expect(combined).toContain("USDC");
    expect(combined).toContain("0x3600000000000000000000000000000000000000");
  });

  it("addresses list with category filter works", async () => {
    const output = captureOutput();
    await runCLI("addresses", "list", "-c", "stablecoins");

    const combined = output.join("\n");
    expect(combined).toContain("USDC");
    expect(combined).toContain("EURC");
  });

  it("addresses list with unknown category sets exitCode", async () => {
    const { exitCode } = await runCLI("addresses", "list", "-c", "invalid-cat");
    expect(exitCode).toBe(1);
  });
});

describe("CLI commands - info", () => {
  beforeEach(() => {
    consoleSpy.log.mockClear();
  });

  it("info evm runs without error", async () => {
    const { exitCode } = await runCLI("info", "evm");
    expect(exitCode).toBeUndefined();
  });

  it("info evm outputs EVM differences", async () => {
    const output = captureOutput();
    await runCLI("info", "evm");

    const combined = output.join("\n");
    expect(combined).toContain("Native token");
    expect(combined).toContain("USDC");
    expect(combined).toContain("Finality");
  });

  it("info providers runs without error", async () => {
    const { exitCode } = await runCLI("info", "providers");
    expect(exitCode).toBeUndefined();
  });

  it("info providers shows provider names", async () => {
    const output = captureOutput();
    await runCLI("info", "providers");

    const combined = output.join("\n");
    expect(combined).toContain("Alchemy");
    expect(combined).toContain("Blockscout");
  });

  it("info providers filters by category", async () => {
    const output = captureOutput();
    await runCLI("info", "providers", "-c", "node");

    const combined = output.join("\n");
    expect(combined).toContain("Alchemy");
    // Compliance providers should not appear when filtering by node
    expect(combined).not.toContain("Elliptic");
  });

  it("info providers unknown category sets exitCode", async () => {
    const { exitCode } = await runCLI("info", "providers", "-c", "nonexistent");
    expect(exitCode).toBe(1);
  });

  it("info compliance runs without error", async () => {
    const output = captureOutput();
    const { exitCode } = await runCLI("info", "compliance");

    expect(exitCode).toBeUndefined();
    const combined = output.join("\n");
    expect(combined).toContain("Elliptic");
    expect(combined).toContain("TRM Labs");
  });
});

describe("CLI commands - transfer validation", () => {
  it("transfer usdc without --from sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "transfer",
      "usdc",
      "-t",
      "0x1234567890123456789012345678901234567890",
      "-a",
      "10"
    );
    expect(exitCode).toBe(1);
  });

  it("transfer usdc with invalid --from sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "transfer",
      "usdc",
      "-f",
      "not-an-address",
      "-t",
      "0x1234567890123456789012345678901234567890",
      "-a",
      "10"
    );
    expect(exitCode).toBe(1);
  });

  it("transfer usdc without --to sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "transfer",
      "usdc",
      "-f",
      "0x1234567890123456789012345678901234567890",
      "-a",
      "10"
    );
    expect(exitCode).toBe(1);
  });

  it("transfer usdc without --amount sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "transfer",
      "usdc",
      "-f",
      "0x1234567890123456789012345678901234567890",
      "-t",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    );
    expect(exitCode).toBe(1);
  });

  it("transfer usdc with invalid amount sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "transfer",
      "usdc",
      "-f",
      "0x1234567890123456789012345678901234567890",
      "-t",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "-a",
      "-5"
    );
    expect(exitCode).toBe(1);
  });
});

describe("CLI commands - bridge validation", () => {
  it("bridge to-arc without --chain sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "bridge",
      "to-arc",
      "-f",
      "0x1234567890123456789012345678901234567890",
      "-t",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "-a",
      "10"
    );
    expect(exitCode).toBe(1);
  });

  it("bridge to-arc with invalid chain sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "bridge",
      "to-arc",
      "-c",
      "Invalid_Chain",
      "-f",
      "0x1234567890123456789012345678901234567890",
      "-t",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "-a",
      "10"
    );
    expect(exitCode).toBe(1);
  });

  it("bridge to-arc without --from sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "bridge",
      "to-arc",
      "-c",
      "Ethereum_Sepolia",
      "-t",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "-a",
      "10"
    );
    expect(exitCode).toBe(1);
  });

  it("bridge to-arc without --amount sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "bridge",
      "to-arc",
      "-c",
      "Ethereum_Sepolia",
      "-f",
      "0x1234567890123456789012345678901234567890",
      "-t",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    );
    expect(exitCode).toBe(1);
  });

  it("bridge from-arc without --chain sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "bridge",
      "from-arc",
      "-f",
      "0x1234567890123456789012345678901234567890",
      "-t",
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      "-a",
      "10"
    );
    expect(exitCode).toBe(1);
  });
});

describe("CLI commands - gateway validation", () => {
  it("gateway deposit without --wallet-id sets exitCode", async () => {
    const { exitCode } = await runCLI("gateway", "deposit", "-a", "100");
    expect(exitCode).toBe(1);
  });

  it("gateway deposit without --amount sets exitCode", async () => {
    const { exitCode } = await runCLI("gateway", "deposit", "-w", "wallet-123");
    expect(exitCode).toBe(1);
  });

  it("gateway deposit with invalid amount sets exitCode", async () => {
    const { exitCode } = await runCLI("gateway", "deposit", "-w", "wallet-123", "-a", "abc");
    expect(exitCode).toBe(1);
  });

  it("gateway transfer without --wallet-id sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "gateway",
      "transfer",
      "-t",
      "0x1234567890123456789012345678901234567890",
      "-c",
      "ETH-SEPOLIA",
      "-a",
      "50"
    );
    expect(exitCode).toBe(1);
  });

  it("gateway transfer without --to sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "gateway",
      "transfer",
      "-w",
      "wallet-123",
      "-c",
      "ETH-SEPOLIA",
      "-a",
      "50"
    );
    expect(exitCode).toBe(1);
  });

  it("gateway transfer without --chain sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "gateway",
      "transfer",
      "-w",
      "wallet-123",
      "-t",
      "0x1234567890123456789012345678901234567890",
      "-a",
      "50"
    );
    expect(exitCode).toBe(1);
  });

  it("gateway transfer without --amount sets exitCode", async () => {
    const { exitCode } = await runCLI(
      "gateway",
      "transfer",
      "-w",
      "wallet-123",
      "-t",
      "0x1234567890123456789012345678901234567890",
      "-c",
      "ETH-SEPOLIA"
    );
    expect(exitCode).toBe(1);
  });
});

describe("CLI commands - send validation", () => {
  it("send with zero amount sets exitCode", async () => {
    const { exitCode } = await runCLI("send", "0", "0x1234567890123456789012345678901234567890");
    expect(exitCode).toBe(1);
  });

  it("send with non-numeric amount sets exitCode", async () => {
    const { exitCode } = await runCLI("send", "abc", "0x1234567890123456789012345678901234567890");
    expect(exitCode).toBe(1);
  });

  it("send with invalid recipient sets exitCode", async () => {
    const { exitCode } = await runCLI("send", "10", "not-an-address");
    expect(exitCode).toBe(1);
  });
});

describe("CLI commands - x402 validation", () => {
  it("x402 test with invalid URL sets exitCode", async () => {
    const { exitCode } = await runCLI("x402", "test", "not-a-url");
    expect(exitCode).toBe(1);
  });

  it("x402 pay with invalid URL sets exitCode", async () => {
    const { exitCode } = await runCLI("x402", "pay", "not-a-url");
    expect(exitCode).toBe(1);
  });
});
