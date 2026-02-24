import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const contractsDir = resolve(process.cwd(), "src/contracts");

describe("SimpleToken contract", () => {
  it("sol file exists", () => {
    expect(existsSync(resolve(contractsDir, "SimpleToken.sol"))).toBe(true);
  });

  it("json artifact exists", () => {
    expect(existsSync(resolve(contractsDir, "SimpleToken.json"))).toBe(true);
  });

  it("artifact has abi and bytecode", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleToken.json"), "utf-8"));
    expect(artifact.abi).toBeDefined();
    expect(Array.isArray(artifact.abi)).toBe(true);
    expect(artifact.bytecode).toBeDefined();
    expect(artifact.bytecode).toMatch(/^0x/);
  });

  it("abi has constructor with name, symbol, supply params", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleToken.json"), "utf-8"));
    const constructor = artifact.abi.find((x: any) => x.type === "constructor");
    expect(constructor).toBeDefined();
    expect(constructor.inputs.length).toBe(3);
    expect(constructor.inputs[0].name).toBe("_name");
    expect(constructor.inputs[1].name).toBe("_symbol");
    expect(constructor.inputs[2].type).toBe("uint256");
  });

  it("abi has ERC-20 functions", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleToken.json"), "utf-8"));
    const functions = artifact.abi
      .filter((x: any) => x.type === "function")
      .map((x: any) => x.name);
    expect(functions).toContain("name");
    expect(functions).toContain("symbol");
    expect(functions).toContain("decimals");
    expect(functions).toContain("totalSupply");
    expect(functions).toContain("balanceOf");
    expect(functions).toContain("transfer");
    expect(functions).toContain("approve");
    expect(functions).toContain("transferFrom");
    expect(functions).toContain("allowance");
  });

  it("sol source has SPDX license", () => {
    const source = readFileSync(resolve(contractsDir, "SimpleToken.sol"), "utf-8");
    expect(source).toContain("SPDX-License-Identifier");
  });

  it("sol source targets solidity 0.8", () => {
    const source = readFileSync(resolve(contractsDir, "SimpleToken.sol"), "utf-8");
    expect(source).toMatch(/pragma solidity \^0\.8/);
  });
});

describe("SimpleNFT contract", () => {
  it("sol file exists", () => {
    expect(existsSync(resolve(contractsDir, "SimpleNFT.sol"))).toBe(true);
  });

  it("json artifact exists", () => {
    expect(existsSync(resolve(contractsDir, "SimpleNFT.json"))).toBe(true);
  });

  it("artifact has abi and bytecode", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleNFT.json"), "utf-8"));
    expect(artifact.abi).toBeDefined();
    expect(artifact.bytecode).toMatch(/^0x/);
  });

  it("abi has constructor with name, symbol, imageURI, description, maxSupply", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleNFT.json"), "utf-8"));
    const constructor = artifact.abi.find((x: any) => x.type === "constructor");
    expect(constructor).toBeDefined();
    expect(constructor.inputs.length).toBe(5);
    expect(constructor.inputs[0].name).toBe("_name");
    expect(constructor.inputs[1].name).toBe("_symbol");
    expect(constructor.inputs[4].type).toBe("uint256");
  });

  it("abi has ERC-721 functions", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleNFT.json"), "utf-8"));
    const functions = artifact.abi
      .filter((x: any) => x.type === "function")
      .map((x: any) => x.name);
    expect(functions).toContain("name");
    expect(functions).toContain("symbol");
    expect(functions).toContain("ownerOf");
    expect(functions).toContain("balanceOf");
    expect(functions).toContain("tokenURI");
    expect(functions).toContain("approve");
    expect(functions).toContain("transferFrom");
    expect(functions).toContain("mint");
    expect(functions).toContain("supportsInterface");
  });

  it("abi has Transfer and Approval events", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleNFT.json"), "utf-8"));
    const events = artifact.abi.filter((x: any) => x.type === "event").map((x: any) => x.name);
    expect(events).toContain("Transfer");
    expect(events).toContain("Approval");
    expect(events).toContain("ApprovalForAll");
  });
});

describe("SimpleDEX contract", () => {
  it("sol file exists", () => {
    expect(existsSync(resolve(contractsDir, "SimpleDEX.sol"))).toBe(true);
  });

  it("json artifact exists", () => {
    expect(existsSync(resolve(contractsDir, "SimpleDEX.json"))).toBe(true);
  });

  it("artifact has abi and bytecode", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleDEX.json"), "utf-8"));
    expect(artifact.abi).toBeDefined();
    expect(artifact.bytecode).toMatch(/^0x/);
  });

  it("abi has AMM functions", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleDEX.json"), "utf-8"));
    const functions = artifact.abi
      .filter((x: any) => x.type === "function")
      .map((x: any) => x.name);
    expect(functions).toContain("createPool");
    expect(functions).toContain("addLiquidity");
    expect(functions).toContain("removeLiquidity");
    expect(functions).toContain("swapUSDCForToken");
    expect(functions).toContain("swapTokenForUSDC");
    expect(functions).toContain("getReserves");
    expect(functions).toContain("getQuote");
    expect(functions).toContain("getPoolCount");
    expect(functions).toContain("getLPBalance");
  });

  it("abi has AMM events", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleDEX.json"), "utf-8"));
    const events = artifact.abi.filter((x: any) => x.type === "event").map((x: any) => x.name);
    expect(events).toContain("PoolCreated");
    expect(events).toContain("LiquidityAdded");
    expect(events).toContain("LiquidityRemoved");
    expect(events).toContain("Swap");
  });

  it("has receive function for native USDC", () => {
    const artifact = JSON.parse(readFileSync(resolve(contractsDir, "SimpleDEX.json"), "utf-8"));
    const receive = artifact.abi.find((x: any) => x.type === "receive");
    expect(receive).toBeDefined();
  });
});
