import { describe, it, expect } from "vitest";
import { formatGasToUSDC, formatGasPriceDisplay, arcTestnet } from "../src/services/rpc.js";
import { ARC_TESTNET, NATIVE_USDC_DECIMALS } from "../src/config/constants.js";

// --- arcTestnet chain definition ---

describe("arcTestnet chain", () => {
  it("has correct chain ID", () => {
    expect(arcTestnet.id).toBe(ARC_TESTNET.chainId);
    expect(arcTestnet.id).toBe(5042002);
  });

  it("has correct name", () => {
    expect(arcTestnet.name).toBe("Arc Testnet");
  });

  it("has USDC as native currency", () => {
    expect(arcTestnet.nativeCurrency.symbol).toBe("USDC");
    expect(arcTestnet.nativeCurrency.name).toBe("USDC");
    expect(arcTestnet.nativeCurrency.decimals).toBe(NATIVE_USDC_DECIMALS);
    expect(arcTestnet.nativeCurrency.decimals).toBe(18);
  });

  it("has RPC URL configured", () => {
    expect(arcTestnet.rpcUrls.default.http).toContain(ARC_TESTNET.rpcUrl);
  });

  it("has block explorer configured", () => {
    expect(arcTestnet.blockExplorers?.default.url).toBe(ARC_TESTNET.explorer);
    expect(arcTestnet.blockExplorers?.default.name).toBe("Arcscan");
  });
});

// --- formatGasToUSDC ---

describe("formatGasToUSDC", () => {
  it("calculates gas cost in USDC", () => {
    // 21000 gas * 160 gwei = 3,360,000 gwei = 3.36e-9 USDC (at 18 decimals)
    const gasUsed = 21000n;
    const gasPrice = 160000000000n; // 160 gwei
    const result = formatGasToUSDC(gasUsed, gasPrice);
    // 21000 * 160e9 = 3.36e15 wei => 3.36e15 / 1e18 = 0.00336
    expect(parseFloat(result)).toBeCloseTo(0.00336, 5);
  });

  it("returns 0 for zero gas", () => {
    const result = formatGasToUSDC(0n, 160000000000n);
    expect(parseFloat(result)).toBe(0);
  });

  it("handles large gas usage", () => {
    // Complex contract deployment: 5,000,000 gas
    const gasUsed = 5000000n;
    const gasPrice = 160000000000n;
    const result = formatGasToUSDC(gasUsed, gasPrice);
    // 5e6 * 160e9 = 8e17 => 0.8 USDC
    expect(parseFloat(result)).toBeCloseTo(0.8, 5);
  });

  it("handles very low gas price", () => {
    const result = formatGasToUSDC(21000n, 1n);
    // 21000 * 1 = 21000 wei => 0.000000000000021 USDC
    expect(parseFloat(result)).toBeGreaterThan(0);
    expect(parseFloat(result)).toBeLessThan(0.001);
  });
});

// --- formatGasPriceDisplay ---

describe("formatGasPriceDisplay", () => {
  it("returns gwei value and estimated tx cost", () => {
    const gasPrice = 160000000000n; // 160 gwei
    const result = formatGasPriceDisplay(gasPrice);

    expect(result.gwei).toBe("160");
    expect(result.estimatedTxCost).toContain("USDC");
    expect(result.estimatedTxCost).toContain("~");
  });

  it("estimates cost for standard 21000 gas transfer", () => {
    const gasPrice = 160000000000n;
    const result = formatGasPriceDisplay(gasPrice);
    // 21000 * 160e9 = 3.36e15 => 0.00336 USDC
    expect(result.estimatedTxCost).toBe("~0.003360 USDC");
  });

  it("handles 1 gwei gas price", () => {
    const gasPrice = 1000000000n; // 1 gwei
    const result = formatGasPriceDisplay(gasPrice);
    expect(result.gwei).toBe("1");
  });

  it("handles zero gas price", () => {
    const result = formatGasPriceDisplay(0n);
    expect(result.gwei).toBe("0");
    expect(result.estimatedTxCost).toBe("~0.000000 USDC");
  });
});
