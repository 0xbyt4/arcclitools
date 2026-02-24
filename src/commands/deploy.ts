import { Command } from "commander";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { log, table, spinner } from "../utils/logger.js";
import { deployContract, callContract, waitForReceipt } from "../services/rpc.js";
import { checkFoundryInstalled } from "../services/foundry.js";
import {
  saveDeployment,
  loadDeployments,
  getDeployment,
  updateDeployment,
} from "../services/deployments.js";
import { ARC_TESTNET } from "../config/constants.js";
import { validateAddress } from "../utils/validator.js";
import { uploadFileToPinata } from "../services/pinata.js";
import { statSync } from "fs";
import type { Abi } from "viem";

const __dirname = dirname(fileURLToPath(import.meta.url));

function compileWithFoundry(
  solPath: string,
  contractName: string
): { abi: Abi; bytecode: `0x${string}`; sourceCode: string } {
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
  const bytecode = artifact.bytecode.startsWith("0x")
    ? artifact.bytecode
    : `0x${artifact.bytecode}`;

  const solPath = resolve(__dirname, "../contracts/SimpleToken.sol");
  const sourceCode = existsSync(solPath) ? readFileSync(solPath, "utf-8") : "";

  return { abi: artifact.abi, bytecode, sourceCode };
}

function loadPrecompiledNFTArtifact(): { abi: Abi; bytecode: `0x${string}`; sourceCode: string } {
  const artifactPath = resolve(__dirname, "../contracts/SimpleNFT.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const bytecode = artifact.bytecode.startsWith("0x")
    ? artifact.bytecode
    : `0x${artifact.bytecode}`;

  const solPath = resolve(__dirname, "../contracts/SimpleNFT.sol");
  const sourceCode = existsSync(solPath) ? readFileSync(solPath, "utf-8") : "";

  return { abi: artifact.abi, bytecode, sourceCode };
}

function loadNFTArtifact(): {
  abi: Abi;
  bytecode: `0x${string}`;
  sourceCode: string;
  compiled: boolean;
} {
  const solPath = resolve(__dirname, "../contracts/SimpleNFT.sol");

  if (checkFoundryInstalled() && existsSync(solPath)) {
    try {
      const result = compileWithFoundry(solPath, "SimpleNFT");
      return { ...result, compiled: true };
    } catch {
      // Fall back to precompiled
    }
  }

  const result = loadPrecompiledNFTArtifact();
  return { ...result, compiled: false };
}

function loadPrecompiledDEXArtifact(): { abi: Abi; bytecode: `0x${string}`; sourceCode: string } {
  const artifactPath = resolve(__dirname, "../contracts/SimpleDEX.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  const bytecode = artifact.bytecode.startsWith("0x")
    ? artifact.bytecode
    : `0x${artifact.bytecode}`;

  const solPath = resolve(__dirname, "../contracts/SimpleDEX.sol");
  const sourceCode = existsSync(solPath) ? readFileSync(solPath, "utf-8") : "";

  return { abi: artifact.abi, bytecode, sourceCode };
}

function loadDEXArtifact(): {
  abi: Abi;
  bytecode: `0x${string}`;
  sourceCode: string;
  compiled: boolean;
} {
  const solPath = resolve(__dirname, "../contracts/SimpleDEX.sol");

  if (checkFoundryInstalled() && existsSync(solPath)) {
    try {
      const result = compileWithFoundry(solPath, "SimpleDEX");
      return { ...result, compiled: true };
    } catch {
      // Fall back to precompiled
    }
  }

  const result = loadPrecompiledDEXArtifact();
  return { ...result, compiled: false };
}

function imageToDataURI(imagePath: string): string {
  const data = readFileSync(imagePath);
  const base64 = data.toString("base64");

  const ext = imagePath.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
  };

  const mime = mimeTypes[ext || ""] || "image/png";
  return `data:${mime};base64,${base64}`;
}

function loadTokenArtifact(): {
  abi: Abi;
  bytecode: `0x${string}`;
  sourceCode: string;
  compiled: boolean;
} {
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
  const data = (await response.json()) as { status: string; result: string; message: string };

  if (data.status === "1" || data.result === "Pass") {
    return { success: true, message: data.result || "Verified" };
  }

  return { success: false, message: data.result || data.message || "Verification failed" };
}

export function registerDeployCommand(program: Command): void {
  const deploy = program.command("deploy").description("Deploy and manage contracts on Arc");

  deploy
    .command("token")
    .description("Deploy an ERC-20 token")
    .argument("<name>", "Token name")
    .argument("<symbol>", "Token symbol")
    .argument("<supply>", "Initial supply (whole tokens, e.g. 1000000)")
    .option("--sol <path>", "Custom Solidity file to deploy instead of default SimpleToken")
    .addHelpText(
      "after",
      `
Examples:
  $ arc deploy token MyToken MTK 1000000
  $ arc deploy token MyToken MTK 1000000 --sol ./MyToken.sol

Deployment info is saved to deployments.json (auto-created).
Verify on Blockscout with: arc deploy verify <address>
`
    )
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

          const contractName = opts.sol
            .replace(/\.sol$/, "")
            .split("/")
            .pop()!;
          solFile = opts.sol;
          s.text = `Compiling ${contractName}.sol...`;
          ({ abi, bytecode } = compileWithFoundry(customPath, contractName));
          log.info(`Compiled from: ${opts.sol}`);
        } else {
          const result = loadTokenArtifact();
          abi = result.abi;
          bytecode = result.bytecode;

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
          ]
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
    .command("nft")
    .description("Deploy an ERC-721 NFT collection with on-chain metadata")
    .argument("<name>", "Collection name")
    .argument("<symbol>", "Collection symbol")
    .argument("<supply>", "Max supply (e.g. 100)")
    .option("--image <path>", "Image file (PNG, JPG, GIF, SVG, WebP)")
    .option("--ipfs", "Upload image to IPFS via Pinata (recommended for images > 24KB)")
    .option("--description <text>", "Collection description", "")
    .option("--mint <quantity>", "Mint tokens to deployer after deploy")
    .option("--sol <path>", "Custom Solidity file to deploy instead of default SimpleNFT")
    .addHelpText(
      "after",
      `
Examples:
  $ arc deploy nft MyNFT MNFT 100 --image ./logo.png
  $ arc deploy nft MyNFT MNFT 100 --image ./art.png --ipfs
  $ arc deploy nft MyNFT MNFT 100 --image ./art.png --description "My collection" --mint 10

Without --ipfs: Image stored on-chain as base64 (max ~24KB).
With --ipfs: Image uploaded to IPFS via Pinata (any size, requires PINATA_JWT in .env).
`
    )
    .action(
      async (
        name: string,
        symbol: string,
        supply: string,
        opts: { image?: string; ipfs?: boolean; description?: string; mint?: string; sol?: string }
      ) => {
        const supplyNum = Number(supply);
        if (isNaN(supplyNum) || supplyNum <= 0) {
          log.error(`Invalid supply: ${supply}`);
          process.exitCode = 1;
          return;
        }

        if (!opts.image) {
          log.error("Image is required. Use --image <path>");
          log.dim("Example: arc deploy nft MyNFT MNFT 100 --image ./logo.png");
          process.exitCode = 1;
          return;
        }

        const imagePath = resolve(process.cwd(), opts.image);
        if (!existsSync(imagePath)) {
          log.error(`Image not found: ${opts.image}`);
          process.exitCode = 1;
          return;
        }

        const fileSizeKB = statSync(imagePath).size / 1024;

        log.title("Deploy ERC-721 NFT");
        log.label("Name", name);
        log.label("Symbol", symbol);
        log.label("Max Supply", supply);
        log.label("Image", `${opts.image} (${fileSizeKB.toFixed(1)} KB)`);
        log.label("Storage", opts.ipfs ? "IPFS (Pinata)" : "On-chain (base64)");
        if (opts.description) log.label("Description", opts.description);
        log.newline();

        // Warn if image is too large for on-chain
        if (!opts.ipfs && fileSizeKB > 24) {
          log.warn(`Image is ${fileSizeKB.toFixed(0)} KB - on-chain limit is ~24 KB.`);
          log.warn("Deploy will likely fail. Use --ipfs flag to upload to IPFS instead.");
          log.dim("Example: arc deploy nft MyNFT MNFT 100 --image ./art.png --ipfs");
          log.newline();
          process.exitCode = 1;
          return;
        }

        const s = spinner(opts.ipfs ? "Uploading image to IPFS..." : "Encoding image...");
        try {
          let imageURI: string;

          if (opts.ipfs) {
            const result = await uploadFileToPinata(imagePath);
            imageURI = result.uri;
            s.succeed("Image uploaded to IPFS");
            log.dim(`CID: ${result.cid}`);
            log.dim(`Gateway: ${result.gatewayUrl}`);
          } else {
            imageURI = imageToDataURI(imagePath);
            const imageSizeKB = (Buffer.byteLength(imageURI, "utf-8") / 1024).toFixed(1);
            log.dim(`Image encoded: ${imageSizeKB} KB as data URI`);
          }

          let abi: Abi;
          let bytecode: `0x${string}`;
          let solFile = "SimpleNFT.sol";

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

            const contractName = opts.sol
              .replace(/\.sol$/, "")
              .split("/")
              .pop()!;
            solFile = opts.sol;
            s.text = `Compiling ${contractName}.sol...`;
            ({ abi, bytecode } = compileWithFoundry(customPath, contractName));
            log.info(`Compiled from: ${opts.sol}`);
          } else {
            s.text = "Compiling contract...";
            const result = loadNFTArtifact();
            abi = result.abi;
            bytecode = result.bytecode;

            if (result.compiled) {
              log.dim("Compiled SimpleNFT.sol with Foundry");
            } else {
              log.dim("Using pre-compiled bytecode (install Foundry to compile from source)");
            }
          }

          s.text = "Deploying NFT contract...";
          const description = opts.description || "";

          const { hash, from, address } = await deployContract({
            abi,
            bytecode,
            args: [name, symbol, imageURI, description, BigInt(supply)],
          });

          s.succeed("NFT contract deployed");
          log.newline();

          table(
            ["Field", "Value"],
            [
              ["Collection", `${name} (${symbol})`],
              ["Contract", address],
              ["Deployer", from],
              ["Max Supply", supply],
              ["Tx Hash", hash],
            ]
          );

          // Mint tokens if requested
          if (opts.mint) {
            const mintQty = Number(opts.mint);
            if (isNaN(mintQty) || mintQty <= 0) {
              log.warn(`Invalid mint quantity: ${opts.mint}`);
            } else if (mintQty > supplyNum) {
              log.warn(`Mint quantity (${mintQty}) exceeds max supply (${supply})`);
            } else {
              log.newline();
              const ms = spinner(`Minting ${mintQty} NFTs to ${from}...`);
              try {
                const mintHash = await callContract({
                  address: address as `0x${string}`,
                  abi,
                  functionName: "mint",
                  args: [from as `0x${string}`, BigInt(mintQty)],
                });
                await waitForReceipt(mintHash);
                ms.succeed(`Minted ${mintQty} NFTs to deployer`);
                log.dim(`Mint tx: ${mintHash}`);
              } catch (err) {
                ms.fail("Minting failed");
                log.error((err as Error).message);
                log.dim(`You can mint later: call mint(address, quantity) on ${address}`);
              }
            }
          }

          // Save deployment info
          saveDeployment({
            name,
            symbol,
            address,
            deployer: from,
            txHash: hash,
            supply,
            decimals: 0,
            network: "Arc Testnet",
            solFile,
            verified: false,
            deployedAt: new Date().toISOString(),
          });

          log.newline();
          log.success("Saved to deployments.json");
          log.dim(`Explorer: ${ARC_TESTNET.explorer}/address/${address}`);
          log.dim(`Verify: arc deploy verify ${address}`);
          if (!opts.mint) {
            log.dim(`Mint NFTs: call mint(address, quantity) on the contract`);
          }
        } catch (err) {
          s.fail("Deployment failed");
          log.error((err as Error).message);
          process.exitCode = 1;
        }
      }
    );

  deploy
    .command("dex")
    .description("Deploy a SimpleDEX (AMM) contract")
    .option("--sol <path>", "Custom Solidity file to deploy instead of default SimpleDEX")
    .addHelpText(
      "after",
      `
Examples:
  $ arc deploy dex
  $ arc deploy dex --sol ./MyDEX.sol

Deploys a constant product AMM (Uniswap V2 style).
All pools are Native USDC / ERC-20 token pairs with 0.3% swap fee.
After deploy, use: arc dex create-pool <token-address>
`
    )
    .action(async (opts: { sol?: string }) => {
      log.title("Deploy SimpleDEX");
      log.newline();

      const s = spinner("Compiling contract...");
      try {
        let abi: Abi;
        let bytecode: `0x${string}`;
        let solFile = "SimpleDEX.sol";

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
            process.exitCode = 1;
            return;
          }

          const contractName = opts.sol
            .replace(/\.sol$/, "")
            .split("/")
            .pop()!;
          solFile = opts.sol;
          s.text = `Compiling ${contractName}.sol...`;
          ({ abi, bytecode } = compileWithFoundry(customPath, contractName));
          log.info(`Compiled from: ${opts.sol}`);
        } else {
          const result = loadDEXArtifact();
          abi = result.abi;
          bytecode = result.bytecode;

          if (result.compiled) {
            log.dim("Compiled SimpleDEX.sol with Foundry");
          } else {
            log.dim("Using pre-compiled bytecode");
          }
        }

        s.text = "Deploying DEX contract...";

        const { hash, from, address } = await deployContract({
          abi,
          bytecode,
        });

        saveDeployment({
          name: "SimpleDEX",
          symbol: "DEX",
          address,
          deployer: from,
          txHash: hash,
          supply: "0",
          decimals: 0,
          network: "Arc Testnet",
          solFile,
          verified: false,
          deployedAt: new Date().toISOString(),
        });

        s.succeed("DEX deployed");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Contract", "SimpleDEX (AMM)"],
            ["Address", address],
            ["Deployer", from],
            ["Fee", "0.3%"],
            ["Tx Hash", hash],
          ]
        );

        log.newline();
        log.success("Saved to deployments.json");
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/address/${address}`);
        log.dim(`Verify: arc deploy verify ${address}`);
        log.dim(`Create pool: arc dex create-pool <token-address> --dex ${address}`);
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
        log.warn(
          "No deployments found. Deploy a token with: arc deploy token <name> <symbol> <supply>"
        );
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
        ])
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
        contractName = opts.sol
          .replace(/\.sol$/, "")
          .split("/")
          .pop()!;
      } else if (deployment) {
        // Load source from the sol file used during deployment
        const solFile = deployment.solFile;
        let solPath: string;

        if (["SimpleToken.sol", "SimpleNFT.sol", "SimpleDEX.sol"].includes(solFile)) {
          solPath = resolve(__dirname, `../contracts/${solFile}`);
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
        contractName = solFile
          .replace(/\.sol$/, "")
          .split("/")
          .pop()!;
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
