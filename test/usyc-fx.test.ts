import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProgram } from "../src/index.js";
import {
  ARC_TESTNET,
  USYC_TELLER_ABI,
  ENTITLEMENTS_ABI,
  FX_ESCROW_ABI,
  TRADE_STATUS_LABELS,
  FUNDING_STATUS_LABELS,
} from "../src/config/constants.js";
import { parseAbi } from "viem";

// Suppress console output
const consoleSpy = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
};

async function runCLI(...args: string[]): Promise<{ exitCode: number | undefined }> {
  process.exitCode = undefined;
  const program = createProgram();
  program.exitOverride();
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });

  try {
    await program.parseAsync(["node", "arc", ...args]);
  } catch {
    // Commander throws on exitOverride
  }

  return { exitCode: process.exitCode as number | undefined };
}

// ==================== USYC Constants Tests ====================

describe("USYC contract addresses", () => {
  it("has USYC token address", () => {
    expect(ARC_TESTNET.contracts.USYC.address).toBe(
      "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C"
    );
  });

  it("has USYC Teller address", () => {
    expect(ARC_TESTNET.contracts.USYCTeller.address).toBe(
      "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A"
    );
  });

  it("has USYC Entitlements address", () => {
    expect(ARC_TESTNET.contracts.USYCEntitlements.address).toBe(
      "0xcc205224862c7641930c87679e98999d23c26113"
    );
  });

  it("USYC has 6 decimals", () => {
    expect(ARC_TESTNET.contracts.USYC.decimals).toBe(6);
  });
});

// ==================== USYC Teller ABI Tests ====================

describe("USYC_TELLER_ABI", () => {
  it("is non-empty array of human-readable strings", () => {
    expect(USYC_TELLER_ABI.length).toBeGreaterThan(0);
    for (const entry of USYC_TELLER_ABI) {
      expect(typeof entry).toBe("string");
    }
  });

  it("can be parsed by viem parseAbi", () => {
    const parsed = parseAbi(USYC_TELLER_ABI as readonly string[]);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("contains ERC-4626 core functions", () => {
    const abiStr = USYC_TELLER_ABI.join("\n");
    expect(abiStr).toContain("function asset()");
    expect(abiStr).toContain("function share()");
    expect(abiStr).toContain("function totalAssets()");
    expect(abiStr).toContain("function deposit(");
    expect(abiStr).toContain("function mint(");
    expect(abiStr).toContain("function redeem(");
    expect(abiStr).toContain("function withdraw(");
  });

  it("contains preview functions", () => {
    const abiStr = USYC_TELLER_ABI.join("\n");
    expect(abiStr).toContain("function previewDeposit(");
    expect(abiStr).toContain("function previewMint(");
    expect(abiStr).toContain("function previewRedeem(");
    expect(abiStr).toContain("function previewWithdraw(");
  });

  it("contains max functions", () => {
    const abiStr = USYC_TELLER_ABI.join("\n");
    expect(abiStr).toContain("function maxDeposit(");
    expect(abiStr).toContain("function maxMint(");
    expect(abiStr).toContain("function maxRedeem(");
    expect(abiStr).toContain("function maxWithdraw(");
  });

  it("contains Hashnote-specific functions", () => {
    const abiStr = USYC_TELLER_ABI.join("\n");
    expect(abiStr).toContain("function oracle()");
    expect(abiStr).toContain("function mintPrice()");
    expect(abiStr).toContain("function authority()");
    expect(abiStr).toContain("function todayTimestamp()");
  });

  it("contains Deposit and Withdraw events", () => {
    const abiStr = USYC_TELLER_ABI.join("\n");
    expect(abiStr).toContain("event Deposit(");
    expect(abiStr).toContain("event Withdraw(");
  });
});

// ==================== Entitlements ABI Tests ====================

describe("ENTITLEMENTS_ABI", () => {
  it("is non-empty array", () => {
    expect(ENTITLEMENTS_ABI.length).toBeGreaterThan(0);
  });

  it("can be parsed by viem parseAbi", () => {
    const parsed = parseAbi(ENTITLEMENTS_ABI as readonly string[]);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("contains canCall function", () => {
    const abiStr = ENTITLEMENTS_ABI.join("\n");
    expect(abiStr).toContain("function canCall(");
  });

  it("contains role management functions", () => {
    const abiStr = ENTITLEMENTS_ABI.join("\n");
    expect(abiStr).toContain("function getUserRoles(");
    expect(abiStr).toContain("function doesUserHaveRole(");
  });

  it("contains paused function", () => {
    const abiStr = ENTITLEMENTS_ABI.join("\n");
    expect(abiStr).toContain("function paused()");
  });
});

// ==================== FxEscrow ABI Tests ====================

describe("FX_ESCROW_ABI", () => {
  it("is non-empty array", () => {
    expect(FX_ESCROW_ABI.length).toBeGreaterThan(0);
  });

  it("can be parsed by viem parseAbi", () => {
    const parsed = parseAbi(FX_ESCROW_ABI as readonly string[]);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("contains trade read functions", () => {
    const abiStr = FX_ESCROW_ABI.join("\n");
    expect(abiStr).toContain("function lastTradeId()");
    expect(abiStr).toContain("function getTradeDetails(");
    expect(abiStr).toContain("function permit2()");
    expect(abiStr).toContain("function relayers(");
  });

  it("contains trade write functions", () => {
    const abiStr = FX_ESCROW_ABI.join("\n");
    expect(abiStr).toContain("function makerDeliver(");
    expect(abiStr).toContain("function takerDeliver(");
    expect(abiStr).toContain("function breach(");
    expect(abiStr).toContain("function batchBreach(");
  });

  it("contains balance query functions", () => {
    const abiStr = FX_ESCROW_ABI.join("\n");
    expect(abiStr).toContain("function getMakerTotalBaseBalances(");
    expect(abiStr).toContain("function getTakerTotalQuoteBalances(");
    expect(abiStr).toContain("function getMakerNetBalances(");
  });
});

// ==================== FxEscrow contract address ====================

describe("FxEscrow contract", () => {
  it("has correct address", () => {
    expect(ARC_TESTNET.contracts.FxEscrow.address).toBe(
      "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8"
    );
  });

  it("has Permit2 address", () => {
    expect(ARC_TESTNET.contracts.Permit2.address).toBe(
      "0x000000000022D473030F116dDEE9F6B43aC78BA3"
    );
  });
});

// ==================== Status label maps ====================

describe("TRADE_STATUS_LABELS", () => {
  it("has all expected statuses", () => {
    expect(TRADE_STATUS_LABELS[0]).toBe("Created");
    expect(TRADE_STATUS_LABELS[1]).toBe("Active");
    expect(TRADE_STATUS_LABELS[2]).toBe("Settled");
    expect(TRADE_STATUS_LABELS[3]).toBe("Breached");
    expect(TRADE_STATUS_LABELS[4]).toBe("Expired");
  });
});

describe("FUNDING_STATUS_LABELS", () => {
  it("has all expected statuses", () => {
    expect(FUNDING_STATUS_LABELS[0]).toBe("Pending");
    expect(FUNDING_STATUS_LABELS[1]).toBe("Partial");
    expect(FUNDING_STATUS_LABELS[2]).toBe("Delivered");
  });
});

// ==================== CLI command registration ====================

describe("CLI - usyc command", () => {
  beforeEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  it("usyc --help shows all subcommands", async () => {
    const program = createProgram();
    const usycCmd = program.commands.find((c) => c.name() === "usyc");
    expect(usycCmd).toBeDefined();

    const subcommands = usycCmd!.commands.map((c) => c.name());
    expect(subcommands).toContain("info");
    expect(subcommands).toContain("rate");
    expect(subcommands).toContain("balance");
    expect(subcommands).toContain("preview");
    expect(subcommands).toContain("deposit");
    expect(subcommands).toContain("redeem");
    expect(subcommands).toContain("withdraw");
    expect(subcommands).toContain("entitled");
  });

  it("usyc preview rejects invalid action", async () => {
    const { exitCode } = await runCLI("usyc", "preview", "invalid", "100");
    expect(exitCode).toBe(1);
  });

  it("usyc preview rejects invalid amount", async () => {
    const { exitCode } = await runCLI("usyc", "preview", "deposit", "0");
    expect(exitCode).toBe(1);
  });

  it("usyc entitled rejects invalid address", async () => {
    const { exitCode } = await runCLI("usyc", "entitled", "not-an-address");
    expect(exitCode).toBe(1);
  });

  it("usyc deposit rejects invalid amount", async () => {
    const { exitCode } = await runCLI("usyc", "deposit", "abc");
    expect(exitCode).toBe(1);
  });

  it("usyc redeem rejects invalid amount", async () => {
    const { exitCode } = await runCLI("usyc", "redeem", "abc");
    expect(exitCode).toBe(1);
  });

  it("usyc withdraw rejects invalid amount", async () => {
    const { exitCode } = await runCLI("usyc", "withdraw", "0");
    expect(exitCode).toBe(1);
  });
});

describe("CLI - fx command", () => {
  beforeEach(() => {
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  it("fx --help shows all subcommands", async () => {
    const program = createProgram();
    const fxCmd = program.commands.find((c) => c.name() === "fx");
    expect(fxCmd).toBeDefined();

    const subcommands = fxCmd!.commands.map((c) => c.name());
    expect(subcommands).toContain("info");
    expect(subcommands).toContain("trade");
    expect(subcommands).toContain("trades");
    expect(subcommands).toContain("breach");
    expect(subcommands).toContain("balances");
    expect(subcommands).toContain("relayer");
  });

  it("fx trade rejects invalid ID", async () => {
    const { exitCode } = await runCLI("fx", "trade", "0");
    expect(exitCode).toBe(1);
  });

  it("fx trade rejects non-numeric ID", async () => {
    const { exitCode } = await runCLI("fx", "trade", "abc");
    expect(exitCode).toBe(1);
  });

  it("fx breach rejects invalid ID", async () => {
    const { exitCode } = await runCLI("fx", "breach", "0");
    expect(exitCode).toBe(1);
  });

  it("fx trades rejects invalid count", async () => {
    const { exitCode } = await runCLI("fx", "trades", "-n", "abc");
    expect(exitCode).toBe(1);
  });
});
