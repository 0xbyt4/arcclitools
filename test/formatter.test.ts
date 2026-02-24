import { describe, it, expect } from "vitest";
import {
  shortenAddress,
  shortenHash,
  formatUSDC,
  formatToken,
  explorerTxUrl,
  explorerAddressUrl,
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
