import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { readContract, getWalletClient, waitForReceipt, approveERC20, arcTestnet } from "../services/rpc.js";
import { validateAddress, validateAmount } from "../utils/validator.js";
import {
  ARC_TESTNET,
  NATIVE_USDC_DECIMALS,
  ERC20_USDC_DECIMALS,
  ERC20_ABI,
  USYC_TELLER_ABI,
  ENTITLEMENTS_ABI,
} from "../config/constants.js";
import { formatUnits, parseUnits, parseAbi, encodeFunctionData } from "viem";

const TELLER = ARC_TESTNET.contracts.USYCTeller.address as `0x${string}`;
const USYC = ARC_TESTNET.contracts.USYC.address as `0x${string}`;
const USDC = ARC_TESTNET.contracts.USDC.address as `0x${string}`;
const ENTITLEMENTS = ARC_TESTNET.contracts.USYCEntitlements.address as `0x${string}`;
const USYC_DECIMALS = ARC_TESTNET.contracts.USYC.decimals ?? 6;
const tellerAbi = parseAbi(USYC_TELLER_ABI as readonly string[]);
const erc20Abi = parseAbi(ERC20_ABI as readonly string[]);
const entitlementsAbi = parseAbi(ENTITLEMENTS_ABI as readonly string[]);

async function tellerRead(functionName: string, args?: unknown[]) {
  return readContract({
    address: TELLER,
    abi: tellerAbi as unknown as readonly unknown[],
    functionName,
    args,
  });
}

export function registerUsycCommand(program: Command): void {
  const usyc = program
    .command("usyc")
    .description("USYC yield-bearing token - mint/redeem via Teller, check rates and entitlements");

  usyc
    .command("info")
    .description("Show USYC Teller information (oracle, mint price, trading hours)")
    .action(async () => {
      const s = spinner("Fetching USYC Teller info...");
      try {
        const [
          asset,
          share,
          oracle,
          mintPrice,
          totalAssets,
          todayTs,
          afterHour,
          isDST,
          authority,
          owner,
        ] = await Promise.all([
          tellerRead("asset") as Promise<string>,
          tellerRead("share") as Promise<string>,
          tellerRead("oracle") as Promise<string>,
          tellerRead("mintPrice") as Promise<bigint>,
          tellerRead("totalAssets") as Promise<bigint>,
          tellerRead("todayTimestamp") as Promise<bigint>,
          tellerRead("afterHourTrading") as Promise<bigint>,
          tellerRead("isDST") as Promise<boolean>,
          tellerRead("authority") as Promise<string>,
          tellerRead("owner") as Promise<string>,
        ]);

        const price = formatUnits(mintPrice, 18);
        const tvl = formatUnits(totalAssets, ERC20_USDC_DECIMALS);
        const todayDate = new Date(Number(todayTs) * 1000).toISOString().split("T")[0];

        s.succeed("USYC Teller");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Teller", TELLER],
            ["USYC Token", share],
            ["Asset (USDC)", asset],
            ["Oracle", oracle],
            ["Authority", authority],
            ["Owner", owner],
            ["Mint Price", `${parseFloat(price).toFixed(6)} USDC per USYC`],
            ["Total Assets", `${parseFloat(tvl).toLocaleString()} USDC`],
            ["Today", todayDate],
            ["After-Hours Trading", `${afterHour.toString()} (cutoff)`],
            ["DST Active", isDST ? "Yes" : "No"],
          ]
        );
      } catch (err) {
        s.fail("Failed to fetch Teller info");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  usyc
    .command("rate")
    .description("Show current USDC <-> USYC exchange rate")
    .action(async () => {
      const s = spinner("Fetching exchange rate...");
      try {
        const oneUSDC = parseUnits("1", ERC20_USDC_DECIMALS);
        const oneUSYC = parseUnits("1", USYC_DECIMALS);

        const [mintPrice, sharesToGet, assetsToGet, previewDep, previewRed] = await Promise.all([
          tellerRead("mintPrice") as Promise<bigint>,
          tellerRead("convertToShares", [oneUSDC]) as Promise<bigint>,
          tellerRead("convertToAssets", [oneUSYC]) as Promise<bigint>,
          tellerRead("previewDeposit", [oneUSDC]) as Promise<bigint>,
          tellerRead("previewRedeem", [oneUSYC]) as Promise<bigint>,
        ]);

        const price = formatUnits(mintPrice, 18);
        const sharesForOneUSDC = formatUnits(sharesToGet, USYC_DECIMALS);
        const assetsForOneUSYC = formatUnits(assetsToGet, ERC20_USDC_DECIMALS);
        const depositPreview = formatUnits(previewDep, USYC_DECIMALS);
        const redeemPreview = formatUnits(previewRed, ERC20_USDC_DECIMALS);

        s.succeed("USYC Exchange Rate");
        log.newline();

        table(
          ["Metric", "Value"],
          [
            ["Mint Price (oracle)", `${parseFloat(price).toFixed(6)} USDC/USYC`],
            ["1 USDC -> USYC (convert)", `${parseFloat(sharesForOneUSDC).toFixed(6)} USYC`],
            ["1 USYC -> USDC (convert)", `${parseFloat(assetsForOneUSYC).toFixed(6)} USDC`],
            ["1 USDC deposit -> USYC", `${parseFloat(depositPreview).toFixed(6)} USYC (after fees)`],
            ["1 USYC redeem -> USDC", `${parseFloat(redeemPreview).toFixed(6)} USDC (after fees)`],
          ]
        );

        log.newline();
        log.dim("USYC is a yield-bearing token backed by US Treasury securities.");
        log.dim("The rate increases over time as yield accrues.");
      } catch (err) {
        s.fail("Failed to fetch rate");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  usyc
    .command("balance")
    .description("Check USYC balance for an address")
    .argument("[address]", "Wallet address (defaults to your wallet)")
    .action(async (address?: string) => {
      const s = spinner("Fetching USYC balance...");
      try {
        let addr: `0x${string}`;
        if (address) {
          if (!validateAddress(address)) {
            s.fail("Invalid address");
            process.exitCode = 1;
            return;
          }
          addr = address as `0x${string}`;
        } else {
          const wallet = getWalletClient();
          addr = wallet.account!.address;
        }

        const balance = (await readContract({
          address: USYC,
          abi: erc20Abi as unknown as readonly unknown[],
          functionName: "balanceOf",
          args: [addr],
        })) as bigint;

        const maxDep = (await tellerRead("maxDeposit", [addr])) as bigint;
        const maxRed = (await tellerRead("maxRedeem", [addr])) as bigint;

        const balFormatted = formatUnits(balance, USYC_DECIMALS);
        const maxDepFormatted = formatUnits(maxDep, ERC20_USDC_DECIMALS);
        const maxRedFormatted = formatUnits(maxRed, USYC_DECIMALS);

        // Calculate USDC value
        let usdcValue = "0";
        if (balance > 0n) {
          const assets = (await tellerRead("convertToAssets", [balance])) as bigint;
          usdcValue = formatUnits(assets, ERC20_USDC_DECIMALS);
        }

        s.succeed("USYC Balance");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Address", addr],
            ["USYC Balance", `${parseFloat(balFormatted).toFixed(6)} USYC`],
            ["USDC Value", `~${parseFloat(usdcValue).toFixed(6)} USDC`],
            ["Max Deposit", `${parseFloat(maxDepFormatted).toLocaleString()} USDC`],
            ["Max Redeem", `${parseFloat(maxRedFormatted).toFixed(6)} USYC`],
          ]
        );
      } catch (err) {
        s.fail("Failed to fetch balance");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  usyc
    .command("preview")
    .description("Preview a deposit, mint, redeem, or withdraw operation")
    .argument("<action>", "Action: deposit, mint, redeem, withdraw")
    .argument("<amount>", "Amount (USDC for deposit/withdraw, USYC for mint/redeem)")
    .action(async (action: string, amount: string) => {
      const validActions = ["deposit", "mint", "redeem", "withdraw"];
      if (!validActions.includes(action)) {
        log.error(`Invalid action: ${action}. Use: ${validActions.join(", ")}`);
        process.exitCode = 1;
        return;
      }
      if (!validateAmount(amount)) {
        log.error(`Invalid amount: ${amount}`);
        process.exitCode = 1;
        return;
      }

      try {
        const isAssetInput = action === "deposit" || action === "withdraw";
        const inputDecimals = isAssetInput ? ERC20_USDC_DECIMALS : USYC_DECIMALS;
        const outputDecimals = isAssetInput ? USYC_DECIMALS : ERC20_USDC_DECIMALS;
        const inputLabel = isAssetInput ? "USDC" : "USYC";
        const outputLabel = isAssetInput ? "USYC" : "USDC";

        const amountWei = parseUnits(amount, inputDecimals);
        const fnName = `preview${action.charAt(0).toUpperCase() + action.slice(1)}`;
        const result = (await tellerRead(fnName, [amountWei])) as bigint;
        const resultFormatted = formatUnits(result, outputDecimals);

        log.title(`Preview ${action}`);
        table(
          ["Field", "Value"],
          [
            ["Input", `${amount} ${inputLabel}`],
            ["Output", `${parseFloat(resultFormatted).toFixed(6)} ${outputLabel}`],
            ["Rate", `1 ${inputLabel} = ~${(parseFloat(resultFormatted) / parseFloat(amount)).toFixed(6)} ${outputLabel}`],
          ]
        );

        log.newline();
        log.dim(`Execute: arc usyc ${action} ${amount}`);
      } catch (err) {
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  usyc
    .command("deposit")
    .description("Deposit USDC to receive USYC shares")
    .argument("<amount>", "Amount of USDC to deposit")
    .action(async (amount: string) => {
      if (!validateAmount(amount)) {
        log.error(`Invalid amount: ${amount}`);
        process.exitCode = 1;
        return;
      }

      const s = spinner("Preparing deposit...");
      try {
        const wallet = getWalletClient();
        const account = wallet.account!;
        const assets = parseUnits(amount, ERC20_USDC_DECIMALS);

        // Preview
        const sharesOut = (await tellerRead("previewDeposit", [assets])) as bigint;
        const sharesFormatted = formatUnits(sharesOut, USYC_DECIMALS);

        log.title("USYC Deposit");
        log.label("Deposit", `${amount} USDC`);
        log.label("Receive", `~${parseFloat(sharesFormatted).toFixed(6)} USYC`);
        log.label("From", account.address);
        log.newline();

        // Approve USDC ERC-20 to Teller
        s.text = "Approving USDC for Teller...";
        const approveHash = await approveERC20({
          tokenAddress: USDC,
          spender: TELLER,
          amount: assets,
        });
        await waitForReceipt(approveHash);
        log.dim(`Approved USDC (tx: ${approveHash})`);

        // Deposit via native USDC value transfer
        s.text = "Depositing USDC...";
        const data = encodeFunctionData({
          abi: tellerAbi,
          functionName: "deposit",
          args: [assets, account.address],
        });

        const hash = await wallet.sendTransaction({
          account,
          chain: arcTestnet,
          to: TELLER,
          data,
          value: parseUnits(amount, NATIVE_USDC_DECIMALS),
        });

        const receipt = await waitForReceipt(hash);

        s.succeed("Deposit complete");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Deposited", `${amount} USDC`],
            ["Received", `~${parseFloat(sharesFormatted).toFixed(6)} USYC`],
            ["Tx Hash", hash],
            ["Block", receipt.blockNumber.toString()],
          ]
        );

        log.newline();
        log.dim(`Check balance: arc usyc balance`);
        log.dim(`Redeem: arc usyc redeem ${parseFloat(sharesFormatted).toFixed(6)}`);
      } catch (err) {
        s.fail("Deposit failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  usyc
    .command("redeem")
    .description("Redeem USYC shares for USDC")
    .argument("<shares>", "Amount of USYC to redeem")
    .action(async (shares: string) => {
      if (!validateAmount(shares)) {
        log.error(`Invalid amount: ${shares}`);
        process.exitCode = 1;
        return;
      }

      const s = spinner("Preparing redemption...");
      try {
        const wallet = getWalletClient();
        const account = wallet.account!;
        const sharesWei = parseUnits(shares, USYC_DECIMALS);

        // Preview
        const assetsOut = (await tellerRead("previewRedeem", [sharesWei])) as bigint;
        const assetsFormatted = formatUnits(assetsOut, ERC20_USDC_DECIMALS);

        log.title("USYC Redeem");
        log.label("Redeem", `${shares} USYC`);
        log.label("Receive", `~${parseFloat(assetsFormatted).toFixed(6)} USDC`);
        log.label("From", account.address);
        log.newline();

        s.text = "Redeeming USYC...";
        const data = encodeFunctionData({
          abi: tellerAbi,
          functionName: "redeem",
          args: [sharesWei, account.address, account.address],
        });

        const hash = await wallet.sendTransaction({
          account,
          chain: arcTestnet,
          to: TELLER,
          data,
        });

        const receipt = await waitForReceipt(hash);

        s.succeed("Redemption complete");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Redeemed", `${shares} USYC`],
            ["Received", `~${parseFloat(assetsFormatted).toFixed(6)} USDC`],
            ["Tx Hash", hash],
            ["Block", receipt.blockNumber.toString()],
          ]
        );

        log.newline();
        log.dim(`Check balance: arc usyc balance`);
      } catch (err) {
        s.fail("Redemption failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  usyc
    .command("withdraw")
    .description("Withdraw an exact USDC amount by burning USYC shares")
    .argument("<amount>", "Exact USDC amount to withdraw")
    .action(async (amount: string) => {
      if (!validateAmount(amount)) {
        log.error(`Invalid amount: ${amount}`);
        process.exitCode = 1;
        return;
      }

      const s = spinner("Preparing withdrawal...");
      try {
        const wallet = getWalletClient();
        const account = wallet.account!;
        const assets = parseUnits(amount, ERC20_USDC_DECIMALS);

        // Preview
        const sharesNeeded = (await tellerRead("previewWithdraw", [assets])) as bigint;
        const sharesFormatted = formatUnits(sharesNeeded, USYC_DECIMALS);

        log.title("USYC Withdraw");
        log.label("Withdraw", `${amount} USDC`);
        log.label("Burns", `~${parseFloat(sharesFormatted).toFixed(6)} USYC`);
        log.label("From", account.address);
        log.newline();

        s.text = "Withdrawing...";
        const data = encodeFunctionData({
          abi: tellerAbi,
          functionName: "withdraw",
          args: [assets, account.address, account.address],
        });

        const hash = await wallet.sendTransaction({
          account,
          chain: arcTestnet,
          to: TELLER,
          data,
        });

        const receipt = await waitForReceipt(hash);

        s.succeed("Withdrawal complete");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Withdrew", `${amount} USDC`],
            ["Burned", `~${parseFloat(sharesFormatted).toFixed(6)} USYC`],
            ["Tx Hash", hash],
            ["Block", receipt.blockNumber.toString()],
          ]
        );
      } catch (err) {
        s.fail("Withdrawal failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  usyc
    .command("entitled")
    .description("Check if an address is entitled to interact with USYC Teller")
    .argument("<address>", "Address to check")
    .action(async (address: string) => {
      if (!validateAddress(address)) {
        log.error(`Invalid address: ${address}`);
        process.exitCode = 1;
        return;
      }

      const s = spinner("Checking entitlements...");
      try {
        const addr = address as `0x${string}`;
        const depositSig = "0x6e553f65" as `0x${string}`; // deposit(uint256,address)
        const redeemSig = "0xba087652" as `0x${string}`; // redeem(uint256,address,address)
        const transferSig = "0xa9059cbb" as `0x${string}`; // transfer(address,uint256)

        const [canDeposit, canRedeem, canTransfer, roles, paused] = await Promise.all([
          readContract({
            address: ENTITLEMENTS,
            abi: entitlementsAbi as unknown as readonly unknown[],
            functionName: "canCall",
            args: [addr, TELLER, depositSig],
          }) as Promise<boolean>,
          readContract({
            address: ENTITLEMENTS,
            abi: entitlementsAbi as unknown as readonly unknown[],
            functionName: "canCall",
            args: [addr, TELLER, redeemSig],
          }) as Promise<boolean>,
          readContract({
            address: ENTITLEMENTS,
            abi: entitlementsAbi as unknown as readonly unknown[],
            functionName: "canCall",
            args: [addr, USYC, transferSig],
          }) as Promise<boolean>,
          readContract({
            address: ENTITLEMENTS,
            abi: entitlementsAbi as unknown as readonly unknown[],
            functionName: "getUserRoles",
            args: [addr],
          }) as Promise<string>,
          readContract({
            address: ENTITLEMENTS,
            abi: entitlementsAbi as unknown as readonly unknown[],
            functionName: "paused",
          }) as Promise<boolean>,
        ]);

        s.succeed("Entitlement Check");
        log.newline();

        table(
          ["Permission", "Status"],
          [
            ["Address", addr],
            ["System Paused", paused ? "YES (all operations blocked)" : "No"],
            ["Can Deposit (Teller)", canDeposit ? "Yes" : "No"],
            ["Can Redeem (Teller)", canRedeem ? "Yes" : "No"],
            ["Can Transfer USYC", canTransfer ? "Yes" : "No"],
            ["Role Bitmap", roles as string],
          ]
        );

        if (!canDeposit && !canRedeem) {
          log.newline();
          log.warn("This address is not entitled to use the USYC Teller.");
          log.dim("Entitlements are managed by the USYC issuer (Hashnote).");
          log.dim("Contact the network operator for allowlist access.");
        }
      } catch (err) {
        s.fail("Failed to check entitlements");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
