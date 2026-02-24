import { describe, it, expect } from "vitest";
import { createProgram } from "../src/index.js";

describe("CLI program", () => {
  const program = createProgram();

  it("has correct name", () => {
    expect(program.name()).toBe("arc");
  });

  it("has description", () => {
    expect(program.description()).toContain("Arc Network");
  });

  it("has version", () => {
    expect(program.version()).toBe("0.1.0");
  });

  it("has all expected top-level commands", () => {
    const commands = program.commands.map((c) => c.name());
    const expected = [
      "config",
      "network",
      "wallet",
      "send",
      "multisend",
      "deploy",
      "message",
      "transfer",
      "bridge",
      "gateway",
      "contract",
      "tx",
      "x402",
      "explore",
      "addresses",
      "info",
      "docs",
      "dex",
    ];

    for (const cmd of expected) {
      expect(commands, `missing command: ${cmd}`).toContain(cmd);
    }
  });

  it("config has subcommands", () => {
    const config = program.commands.find((c) => c.name() === "config");
    const subs = config!.commands.map((c) => c.name());
    expect(subs).toContain("set");
    expect(subs).toContain("get");
    expect(subs).toContain("list");
    expect(subs).toContain("reset");
  });

  it("network has subcommands", () => {
    const network = program.commands.find((c) => c.name() === "network");
    const subs = network!.commands.map((c) => c.name());
    expect(subs).toContain("info");
    expect(subs).toContain("status");
    expect(subs).toContain("gas");
  });

  it("wallet has subcommands", () => {
    const wallet = program.commands.find((c) => c.name() === "wallet");
    const subs = wallet!.commands.map((c) => c.name());
    expect(subs).toContain("generate");
    expect(subs).toContain("balance");
    expect(subs).toContain("fund");
  });

  it("deploy has subcommands", () => {
    const deploy = program.commands.find((c) => c.name() === "deploy");
    const subs = deploy!.commands.map((c) => c.name());
    expect(subs).toContain("token");
    expect(subs).toContain("nft");
    expect(subs).toContain("dex");
    expect(subs).toContain("list");
    expect(subs).toContain("verify");
  });

  it("dex has subcommands", () => {
    const dex = program.commands.find((c) => c.name() === "dex");
    const subs = dex!.commands.map((c) => c.name());
    expect(subs).toContain("create-pool");
    expect(subs).toContain("add-liquidity");
    expect(subs).toContain("remove-liquidity");
    expect(subs).toContain("swap");
    expect(subs).toContain("quote");
    expect(subs).toContain("pools");
  });

  it("bridge has subcommands", () => {
    const bridge = program.commands.find((c) => c.name() === "bridge");
    const subs = bridge!.commands.map((c) => c.name());
    expect(subs).toContain("to-arc");
    expect(subs).toContain("from-arc");
    expect(subs).toContain("status");
  });

  it("message has subcommands", () => {
    const message = program.commands.find((c) => c.name() === "message");
    const subs = message!.commands.map((c) => c.name());
    expect(subs).toContain("write");
    expect(subs).toContain("read");
  });
});
