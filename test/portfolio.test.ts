import { describe, it, expect, vi } from "vitest";
import { createProgram } from "../src/index.js";

// Suppress all console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Helper: run CLI command through Commander
async function runCLI(...args: string[]): Promise<{ exitCode: number | undefined }> {
  process.exitCode = undefined;

  const program = createProgram();
  program.exitOverride();
  program.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });

  try {
    await program.parseAsync(["node", "arc", ...args]);
  } catch {
    // Commander throws on exitOverride
  }

  return { exitCode: process.exitCode as number | undefined };
}

describe("CLI commands - portfolio", () => {
  it("portfolio --help shows usage", async () => {
    await runCLI("portfolio", "--help");
  });

  it("portfolio rejects invalid address", async () => {
    const { exitCode } = await runCLI("portfolio", "0xinvalid");
    expect(exitCode).toBe(1);
  });

  it("portfolio rejects invalid limit", async () => {
    const { exitCode } = await runCLI(
      "portfolio",
      "0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB",
      "--limit",
      "0"
    );
    expect(exitCode).toBe(1);
  });

  it("portfolio rejects limit above 50", async () => {
    const { exitCode } = await runCLI(
      "portfolio",
      "0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB",
      "--limit",
      "100"
    );
    expect(exitCode).toBe(1);
  });

  it("portfolio rejects non-numeric limit", async () => {
    const { exitCode } = await runCLI(
      "portfolio",
      "0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB",
      "--limit",
      "abc"
    );
    expect(exitCode).toBe(1);
  });
});
