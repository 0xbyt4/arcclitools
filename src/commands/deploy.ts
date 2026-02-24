import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { log, table, spinner } from "../utils/logger.js";
import { deployContract } from "../services/rpc.js";
import { checkFoundryInstalled } from "../services/foundry.js";
import { saveDeployment, loadDeployments, getDeployment, updateDeployment } from "../services/deployments.js";
import { ARC_TESTNET } from "../config/constants.js";
import { validateAddress } from "../utils/validator.js";
import type { Abi } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));

function compileWithFoundry(solPath: string, contractName: string): { abi: Abi; bytecode: `0x${string}`; sourceCode: string } {
  const tmpDir = execSync("mktemp -d", { encoding: "utf-8" }).trim();

  execSync(`forge init --no-git --quiet "${tmpDir}"`, { stdio: "pipe" });
  execSync(`cp "${solPath}" "${tmpDir}/src/${contractName}.sol"`, { stdio: "pipe" });
  execSync(`forge build --root "${tmpDir}" --quiet`, { stdio: "pipe" });

  const artifactPath = `${tmpDir}/out/${contractName}.sol/${contractName}.json`;
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const bytecode = artifact.bytecode.object.startsWith("0x")
    ? artifact.bytecode.object
    : `0x${artifact.bytecode.object}`;

  const sourceCode = readFileSync(solPath, "utf-8");

  execSync(`rm -rf "${tmpDir}"`, { stdio: "pipe" });

  return { abi: artifact.abi, bytecode: bytecode as `0x${string}`, sourceCode };
}

function loadPrecompiledArtifact(): { abi: Abi; bytecode: `0x${string}`; sourceCode: string } {
  const artifactPath = resolve(__dirname, "../contracts/SimpleToken.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const bytecode = artifact.bytecode.startsWith("0x") ? artifact.bytecode : `0x${artifact.bytecode}`;

  const solPath = resolve(__dirname, "../contracts/SimpleToken.sol");
  const sourceCode = existsSync(solPath) ? readFileSync(solPath, "utf-8") : "";

  return { abi: artifact.abi, bytecode, sourceCode };
}

function loadTokenArtifact(): { abi: Abi; bytecode: `0x${string}`; sourceCode: string; compiled: boolean } {
  const solPath = resolve(__dirname, "../contracts/SimpleToken.sol");

  if (checkFoundryInstalled() && existsSync(solPath)) {
    try {
      const result = compileWithFoundry(solPath, "SimpleToken");
      return { ...result, compiled: true };
    } catch {
      // Fall back to precompiled
    }
  }

  const result = loadPrecompiledArtifact();
  return { ...result, compiled: false };
}

async function verifyOnBlockscout(params: {
  address: string;
  sourceCode: string;
  contractName: string;
  compilerVersion?: string;
  constructorArgs?: string;
}): Promise<{ success: boolean; message: string }> {
  const apiUrl = `${ARC_TESTNET.explorer}/api`;

  const body = new URLSearchParams({
    module: "contract",
    action: "verifysourcecode",
    contractaddress: params.address,
    sourceCode: params.sourceCode,
    codeformat: "solidity-single-file",
    contractname: params.contractName,
    compilerversion: params.compilerVersion || "v0.8.28+commit.7893614a",
    optimizationUsed: "0",
    runs: "200",
    evmversion: "prague",
    licenseType: "3",
  });

  if (params.constructorArgs) {
    body.append("constructorArguements", params.constructorArgs);
  }

  const response = await fetch(`${apiUrl}?${body.toString()}`);
  const data = await response.json() as { status: string; result: string; message: string };

  if (data.status === "1" || data.result === "Pass") {
    return { success: true, message: data.result || "Verified" };
  }

  return { success: false, message: data.result || data.message || "Verification failed" };
}

export function registerDeployCommand(program: Command): void {
  const deploy = program
    .command("deploy")
    .description("Deploy and manage contracts on Arc");

  deploy
    .command("token")
    .description("Deploy an ERC-20 token")
    .argument("<name>", "Token name")
    .argument("<symbol>", "Token symbol")
    .argument("<supply>", "Initial supply (whole tokens, e.g. 1000000)")
    .option("--sol <path>", "Custom Solidity file to deploy instead of default SimpleToken")
    .action(async (name: string, symbol: string, supply: string, opts: { sol?: string }) => {
      const supplyNum = Number(supply);
      if (isNaN(supplyNum) || supplyNum <= 0) {
        log.error(`Invalid supply: ${supply}`);
        process.exitCode = 1;
        return;
      }

      log.title("Deploy ERC-20 Token");
      log.label("Name", name);
      log.label("Symbol", symbol);
      log.label("Supply", `${supply} ${symbol} (+ 18 decimals)`);
      log.newline();

      const s = spinner("Compiling contract...");
      try {
        let abi: Abi;
        let bytecode: `0x${string}`;
        let sourceCode: string;
        let solFile = "SimpleToken.sol";

        if (opts.sol) {
          const customPath = resolve(process.cwd(), opts.sol);
          if (!existsSync(customPath)) {
            s.fail("File not found");
            log.error(`File not found: ${opts.sol}`);
            process.exitCode = 1;
            return;
          }

          if (!checkFoundryInstalled()) {
            s.fail("Foundry required");
            log.error("Foundry is required to compile custom .sol files.");
            log.dim("Install with: curl -L https://foundry.paradigm.xyz | bash");
            process.exitCode = 1;
            return;
          }

          const contractName = opts.sol.replace(/\.sol$/, "").split("/").pop()!;
          solFile = opts.sol;
          s.text = `Compiling ${contractName}.sol...`;
          ({ abi, bytecode, sourceCode } = compileWithFoundry(customPath, contractName));
          log.info(`Compiled from: ${opts.sol}`);
        } else {
          const result = loadTokenArtifact();
          abi = result.abi;
          bytecode = result.bytecode;
          sourceCode = result.sourceCode;

          if (result.compiled) {
            log.dim("Compiled SimpleToken.sol with Foundry");
          } else {
            log.dim("Using pre-compiled bytecode (install Foundry to compile from source)");
          }
        }

        s.text = "Deploying token contract...";

        const { hash, from, address } = await deployContract({
          abi,
          bytecode,
          args: [name, symbol, BigInt(supply)],
        });

        // Save deployment info
        saveDeployment({
          name,
          symbol,
          address,
          deployer: from,
          txHash: hash,
          supply,
          decimals: 18,
          network: "Arc Testnet",
          solFile,
          verified: false,
          deployedAt: new Date().toISOString(),
        });

        s.succeed("Token deployed");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Token", `${name} (${symbol})`],
            ["Contract", address],
            ["Deployer", from],
            ["Supply", `${supply} ${symbol}`],
            ["Decimals", "18"],
            ["Tx Hash", hash],
          ],
        );

        log.newline();
        log.success("Saved to deployments.json");
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/address/${address}`);
        log.dim(`Verify: arc deploy verify ${address}`);
        log.dim(`Send tokens: arc send 100 <address> --token ${address}`);
      } catch (err) {
        s.fail("Deployment failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  deploy
    .command("list")
    .description("List all deployed contracts")
    .action(() => {
      const deployments = loadDeployments();

      if (deployments.length === 0) {
        log.warn("No deployments found. Deploy a token with: arc deploy token <name> <symbol> <supply>");
        return;
      }

      log.title(`Deployments (${deployments.length})`);
      log.newline();
      table(
        ["#", "Name", "Symbol", "Address", "Supply", "Verified", "Date"],
        deployments.map((d, i) => [
          String(i + 1),
          d.name,
          d.symbol,
          d.address,
          d.supply,
          d.verified ? "Yes" : "No",
          d.deployedAt.slice(0, 10),
        ]),
      );
    });

  deploy
    .command("verify")
    .description("Verify a deployed contract on Blockscout")
    .argument("<address>", "Contract address to verify")
    .option("--sol <path>", "Solidity source file (auto-detected from deployments.json)")
    .action(async (address: string, opts: { sol?: string }) => {
      if (!validateAddress(address)) {
        log.error(`Invalid address: ${address}`);
        process.exitCode = 1;
        return;
      }

      const deployment = getDeployment(address);

      let sourceCode: string;
      let contractName: string;

      if (opts.sol) {
        const solPath = resolve(process.cwd(), opts.sol);
        if (!existsSync(solPath)) {
          log.error(`File not found: ${opts.sol}`);
          process.exitCode = 1;
          return;
        }
        sourceCode = readFileSync(solPath, "utf-8");
        contractName = opts.sol.replace(/\.sol$/, "").split("/").pop()!;
      } else if (deployment) {
        // Load source from the sol file used during deployment
        const solFile = deployment.solFile;
        let solPath: string;

        if (solFile === "SimpleToken.sol") {
          solPath = resolve(__dirname, "../contracts/SimpleToken.sol");
        } else {
          solPath = resolve(process.cwd(), solFile);
        }

        if (!existsSync(solPath)) {
          log.error(`Source file not found: ${solFile}`);
          log.dim("Provide it manually with: arc deploy verify <address> --sol <file>");
          process.exitCode = 1;
          return;
        }

        sourceCode = readFileSync(solPath, "utf-8");
        contractName = solFile.replace(/\.sol$/, "").split("/").pop()!;
      } else {
        log.error("Contract not found in deployments.json");
        log.dim("Provide source file manually with: arc deploy verify <address> --sol <file>");
        process.exitCode = 1;
        return;
      }

      log.title("Contract Verification");
      log.label("Address", address);
      log.label("Contract", contractName);
      if (deployment) {
        log.label("Token", `${deployment.name} (${deployment.symbol})`);
      }
      log.newline();

      const s = spinner("Submitting to Blockscout for verification...");
      try {
        const result = await verifyOnBlockscout({
          address,
          sourceCode,
          contractName,
        });

        if (result.success) {
          s.succeed("Contract verified");

          if (deployment) {
            updateDeployment(address, { verified: true });
            log.success("Updated deployments.json (verified: true)");
          }

          log.newline();
          log.dim(`View: ${ARC_TESTNET.explorer}/address/${address}`);
        } else {
          s.fail("Verification failed");
          log.error(result.message);
          log.newline();
          log.dim("Common issues:");
          log.dim("  - Compiler version mismatch");
          log.dim("  - Source code doesn't match deployed bytecode");
          log.dim("  - Constructor arguments encoding mismatch");
        }
      } catch (err) {
        s.fail("Verification failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
