import { describe, it, expect } from "vitest";
import {
  validateAddress,
  validateTxHash,
  validateAmount,
  validatePrivateKey,
  validateUrl,
  requireValidAddress,
  requireValidTxHash,
  requireValidAmount,
} from "../src/utils/validator.js";

describe("validateAddress", () => {
  it("accepts valid checksummed address", () => {
    expect(validateAddress("0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB")).toBe(true);
  });

  it("accepts valid lowercase address", () => {
    expect(validateAddress("0x6508abe0cfe0290b4b29ebd0f88102f8425d29bb")).toBe(true);
  });

  it("accepts zero address", () => {
    expect(validateAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("rejects short address", () => {
    expect(validateAddress("0x1234")).toBe(false);
  });

  it("rejects address without 0x prefix", () => {
    expect(validateAddress("6508Abe0cFE0290B4b29EBD0F88102F8425d29bB")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateAddress("")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(validateAddress("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG")).toBe(false);
  });

  it("rejects address that is too long", () => {
    expect(validateAddress("0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bBFF")).toBe(false);
  });
});

describe("validateTxHash", () => {
  it("accepts valid 66-char tx hash", () => {
    expect(
      validateTxHash("0x7c507aeb7d4714fd0dbf237114782bcc128d40c97325de7ee9ba8a9a48037638")
    ).toBe(true);
  });

  it("rejects short hash", () => {
    expect(validateTxHash("0x1234")).toBe(false);
  });

  it("rejects hash without 0x prefix", () => {
    expect(validateTxHash("7c507aeb7d4714fd0dbf237114782bcc128d40c97325de7ee9ba8a9a48037638")).toBe(
      false
    );
  });

  it("rejects empty string", () => {
    expect(validateTxHash("")).toBe(false);
  });
});

describe("validateAmount", () => {
  it("accepts positive integer", () => {
    expect(validateAmount("100")).toBe(true);
  });

  it("accepts positive decimal", () => {
    expect(validateAmount("0.001")).toBe(true);
  });

  it("accepts large number", () => {
    expect(validateAmount("1000000")).toBe(true);
  });

  it("rejects zero", () => {
    expect(validateAmount("0")).toBe(false);
  });

  it("rejects negative number", () => {
    expect(validateAmount("-1")).toBe(false);
  });

  it("rejects non-numeric string", () => {
    expect(validateAmount("abc")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateAmount("")).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(validateAmount("Infinity")).toBe(false);
  });

  it("rejects NaN string", () => {
    expect(validateAmount("NaN")).toBe(false);
  });
});

describe("validatePrivateKey", () => {
  it("accepts 64-char hex without prefix", () => {
    expect(
      validatePrivateKey("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    ).toBe(true);
  });

  it("accepts 64-char hex with 0x prefix", () => {
    expect(
      validatePrivateKey("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
    ).toBe(true);
  });

  it("rejects short key", () => {
    expect(validatePrivateKey("0x1234")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(
      validatePrivateKey("0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ")
    ).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePrivateKey("")).toBe(false);
  });
});

describe("validateUrl", () => {
  it("accepts valid https URL", () => {
    expect(validateUrl("https://rpc.testnet.arc.network")).toBe(true);
  });

  it("accepts valid http URL", () => {
    expect(validateUrl("http://localhost:3000")).toBe(true);
  });

  it("accepts URL with path", () => {
    expect(validateUrl("https://example.com/api/v1")).toBe(true);
  });

  it("rejects plain string", () => {
    expect(validateUrl("not-a-url")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validateUrl("")).toBe(false);
  });
});

describe("requireValidAddress", () => {
  it("returns address when valid", () => {
    expect(requireValidAddress("0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB")).toBe(
      "0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB"
    );
  });

  it("throws with label when invalid", () => {
    expect(() => requireValidAddress("0x123", "sender")).toThrow("Invalid sender: 0x123");
  });

  it("throws default label when invalid", () => {
    expect(() => requireValidAddress("bad")).toThrow("Invalid Address: bad");
  });
});

describe("requireValidTxHash", () => {
  it("returns hash when valid", () => {
    const hash = "0x7c507aeb7d4714fd0dbf237114782bcc128d40c97325de7ee9ba8a9a48037638";
    expect(requireValidTxHash(hash)).toBe(hash);
  });

  it("throws when invalid", () => {
    expect(() => requireValidTxHash("0x123")).toThrow("Invalid transaction hash");
  });
});

describe("requireValidAmount", () => {
  it("returns amount when valid", () => {
    expect(requireValidAmount("100")).toBe("100");
  });

  it("throws when invalid", () => {
    expect(() => requireValidAmount("0")).toThrow("Invalid amount");
  });

  it("throws when negative", () => {
    expect(() => requireValidAmount("-5")).toThrow("Invalid amount");
  });
});
