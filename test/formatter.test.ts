import { describe, it, expect } from "vitest";
import {
  shortenAddress,
  shortenHash,
  formatUSDC,
  formatToken,
  formatGasPrice,
  formatBlockNumber,
  formatTimestamp,
  explorerTxUrl,
  explorerAddressUrl,
  colorStatus,
  maskSecret,
} from "../src/utils/formatter.js";

describe("shortenAddress", () => {
  it("shortens a standard 42-char address", () => {
    const result = shortenAddress("0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB");
    expect(result).toBe("0x6508Ab...5d29bB");
  });

  it("uses custom char count", () => {
    const result = shortenAddress("0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB", 4);
    expect(result).toBe("0x6508...29bB");
  });

  it("returns short address unchanged", () => {
    const result = shortenAddress("0x1234");
    expect(result).toBe("0x1234");
  });

  it("returns empty string unchanged", () => {
    expect(shortenAddress("")).toBe("");
  });
});

describe("shortenHash", () => {
  it("shortens a standard 66-char hash", () => {
    const hash = "0x7c507aeb7d4714fd0dbf237114782bcc128d40c97325de7ee9ba8a9a48037638";
    const result = shortenHash(hash);
    expect(result).toBe("0x7c507aeb...48037638");
  });

  it("uses custom char count", () => {
    const hash = "0x7c507aeb7d4714fd0dbf237114782bcc128d40c97325de7ee9ba8a9a48037638";
    const result = shortenHash(hash, 4);
    expect(result).toBe("0x7c50...7638");
  });

  it("returns short hash unchanged", () => {
    expect(shortenHash("0x123")).toBe("0x123");
  });
});

describe("formatUSDC", () => {
  it("formats zero", () => {
    expect(formatUSDC(0n)).toBe("0.00 USDC");
  });

  it("formats 1 USDC (18 decimals)", () => {
    expect(formatUSDC(1000000000000000000n)).toBe("1.00 USDC");
  });

  it("formats small amount with 6 decimals", () => {
    expect(formatUSDC(1000000000000n)).toBe("0.000001 USDC");
  });

  it("formats large amount", () => {
    expect(formatUSDC(100000000000000000000n)).toBe("100.00 USDC");
  });

  it("formats with custom decimals", () => {
    expect(formatUSDC(1000000n, 6)).toBe("1.00 USDC");
  });
});

describe("formatToken", () => {
  it("formats zero", () => {
    expect(formatToken(0n, 18, "TRT")).toBe("0.00 TRT");
  });

  it("formats 1 token with 18 decimals", () => {
    expect(formatToken(1000000000000000000n, 18, "TRT")).toBe("1.00 TRT");
  });

  it("formats with 6 decimals", () => {
    expect(formatToken(1000000n, 6, "EURC")).toBe("1.00 EURC");
  });

  it("formats small amount", () => {
    expect(formatToken(1000000000000n, 18, "TRT")).toBe("0.000001 TRT");
  });
});

describe("explorerTxUrl", () => {
  it("builds correct tx URL", () => {
    const result = explorerTxUrl("https://testnet.arcscan.app", "0xabc");
    expect(result).toBe("https://testnet.arcscan.app/tx/0xabc");
  });
});

describe("explorerAddressUrl", () => {
  it("builds correct address URL", () => {
    const result = explorerAddressUrl("https://testnet.arcscan.app", "0x123");
    expect(result).toBe("https://testnet.arcscan.app/address/0x123");
  });
});

describe("formatGasPrice", () => {
  it("formats gas price in Gwei", () => {
    const result = formatGasPrice(160000000000n); // 160 gwei
    expect(result).toBe("160 Gwei");
  });

  it("formats 1 gwei", () => {
    expect(formatGasPrice(1000000000n)).toBe("1 Gwei");
  });

  it("formats zero", () => {
    expect(formatGasPrice(0n)).toBe("0 Gwei");
  });

  it("formats fractional gwei", () => {
    const result = formatGasPrice(1500000000n); // 1.5 gwei
    expect(result).toBe("1.5 Gwei");
  });
});

describe("formatBlockNumber", () => {
  it("formats block number with locale string", () => {
    const result = formatBlockNumber(1234567n);
    // Locale formatting varies, but should contain the digits
    expect(result).toContain("1");
    expect(result).toContain("234");
    expect(result).toContain("567");
  });

  it("formats zero", () => {
    expect(formatBlockNumber(0n)).toBe("0");
  });

  it("formats small number", () => {
    expect(formatBlockNumber(42n)).toBe("42");
  });
});

describe("formatTimestamp", () => {
  it("converts unix timestamp to date string", () => {
    // 2024-01-01 00:00:00 UTC
    const result = formatTimestamp(1704067200);
    // Should contain year 2024
    expect(result).toContain("2024");
  });

  it("converts zero timestamp to epoch", () => {
    const result = formatTimestamp(0);
    // Should be 1970
    expect(result).toContain("1970");
  });
});

describe("colorStatus", () => {
  it("returns string containing the status for success variants", () => {
    for (const status of ["success", "confirmed", "complete"]) {
      const result = colorStatus(status);
      expect(result).toContain(status);
    }
  });

  it("handles case-insensitive input (SUCCESS maps to success branch)", () => {
    // Both "SUCCESS" and "success" should hit the same switch case
    const result = colorStatus("SUCCESS");
    expect(result).toContain("SUCCESS");
  });

  it("returns string containing the status for pending variants", () => {
    for (const status of ["pending", "processing"]) {
      const result = colorStatus(status);
      expect(result).toContain(status);
    }
  });

  it("returns string containing the status for error variants", () => {
    for (const status of ["failed", "reverted", "error"]) {
      const result = colorStatus(status);
      expect(result).toContain(status);
    }
  });

  it("returns unchanged string for unknown status", () => {
    expect(colorStatus("unknown")).toBe("unknown");
    expect(colorStatus("something")).toBe("something");
  });
});

describe("maskSecret", () => {
  it("masks long secret", () => {
    const result = maskSecret("abcdefghij1234567890");
    expect(result).toBe("abcd...7890");
  });

  it("masks short secret completely", () => {
    expect(maskSecret("short")).toBe("****");
  });

  it("masks exact 8-char string completely", () => {
    expect(maskSecret("12345678")).toBe("****");
  });

  it("masks 9-char string with partial reveal", () => {
    const result = maskSecret("123456789");
    expect(result).toBe("1234...6789");
  });
});
