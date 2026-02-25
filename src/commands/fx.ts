import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { readContract, getWalletClient, callContract, waitForReceipt } from "../services/rpc.js";
import { validateAmount } from "../utils/validator.js";
import {
  ARC_TESTNET,
  ERC20_USDC_DECIMALS,
  FX_ESCROW_ABI,
  TRADE_STATUS_LABELS,
  FUNDING_STATUS_LABELS,
} from "../config/constants.js";
import { formatUnits, parseAbi, type Abi } from "viem";

const FX_ESCROW = ARC_TESTNET.contracts.FxEscrow.address as `0x${string}`;
const fxAbi = parseAbi(FX_ESCROW_ABI as readonly string[]);

interface TradeDetails {
  baseToken: string;
  quoteToken: string;
  maker: string;
  taker: string;
  makerSigner: string;
  baseAmount: bigint;
  quoteAmount: bigint;
  makerFee: bigint;
  takerFee: bigint;
  makerDelivered: bigint;
  takerDelivered: bigint;
  expiryDate: bigint;
  status: number;
  makerFundingStatus: number;
  takerFundingStatus: number;
}

async function fxRead(functionName: string, args?: unknown[]) {
  return readContract({
    address: FX_ESCROW,
    abi: fxAbi as unknown as readonly unknown[],
    functionName,
    args,
  });
}

function resolveTokenSymbol(address: string): string {
  const normalized = address.toLowerCase();
  const usdc = ARC_TESTNET.contracts.USDC.address.toLowerCase();
  const eurc = ARC_TESTNET.contracts.EURC.address.toLowerCase();
  if (normalized === usdc) return "USDC";
  if (normalized === eurc) return "EURC";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatTradeAmount(amount: bigint, tokenAddr: string): string {
  const symbol = resolveTokenSymbol(tokenAddr);
  return `${formatUnits(amount, ERC20_USDC_DECIMALS)} ${symbol}`;
}

function parseTrade(result: unknown): TradeDetails {
  const r = result as readonly unknown[];
  return {
    baseToken: r[0] as string,
    quoteToken: r[1] as string,
    maker: r[2] as string,
    taker: r[3] as string,
    makerSigner: r[4] as string,
    baseAmount: r[5] as bigint,
    quoteAmount: r[6] as bigint,
    makerFee: r[7] as bigint,
    takerFee: r[8] as bigint,
    makerDelivered: r[9] as bigint,
    takerDelivered: r[10] as bigint,
    expiryDate: r[11] as bigint,
    status: Number(r[12]),
    makerFundingStatus: Number(r[13]),
    takerFundingStatus: Number(r[14]),
  };
}

export function registerFxCommand(program: Command): void {
  const fx = program
    .command("fx")
    .description("StableFX - escrow-based stablecoin FX trades (USDC <-> EURC) via Permit2");

  fx.command("info")
    .description("Show StableFX escrow information")
    .action(async () => {
      const s = spinner("Fetching StableFX info...");
      try {
        const [lastId, permit2, owner, domain] = await Promise.all([
          fxRead("lastTradeId") as Promise<bigint>,
          fxRead("permit2") as Promise<string>,
          fxRead("owner") as Promise<string>,
          fxRead("eip712Domain") as Promise<readonly unknown[]>,
        ]);

        const [, name, version, chainId, verifyingContract] = domain;

        s.succeed("StableFX (FxEscrow)");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Contract", FX_ESCROW],
            ["Owner", owner],
            ["Permit2", permit2],
            ["Total Trades", lastId.toString()],
            ["EIP-712 Name", name as string],
            ["EIP-712 Version", version as string],
            ["Chain ID", (chainId as bigint).toString()],
            ["Verifying Contract", verifyingContract as string],
          ]
        );

        log.newline();
        log.dim("StableFX uses Permit2 witness signatures for escrow-based FX trades.");
        log.dim("Trades are recorded by authorized relayers and settled by maker/taker delivery.");
      } catch (err) {
        s.fail("Failed to fetch StableFX info");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  fx.command("trade")
    .description("Get details of a specific FX trade")
    .argument("<id>", "Trade ID")
    .action(async (id: string) => {
      const tradeId = parseInt(id, 10);
      if (isNaN(tradeId) || tradeId < 1) {
        log.error("Trade ID must be a positive integer");
        process.exitCode = 1;
        return;
      }

      const s = spinner(`Fetching trade #${tradeId}...`);
      try {
        const result = await fxRead("getTradeDetails", [BigInt(tradeId)]);
        const trade = parseTrade(result);

        const baseSymbol = resolveTokenSymbol(trade.baseToken);
        const quoteSymbol = resolveTokenSymbol(trade.quoteToken);
        const baseAmt = formatUnits(trade.baseAmount, ERC20_USDC_DECIMALS);
        const quoteAmt = formatUnits(trade.quoteAmount, ERC20_USDC_DECIMALS);
        const makerFee = formatUnits(trade.makerFee, ERC20_USDC_DECIMALS);
        const takerFee = formatUnits(trade.takerFee, ERC20_USDC_DECIMALS);
        const makerDel = formatUnits(trade.makerDelivered, ERC20_USDC_DECIMALS);
        const takerDel = formatUnits(trade.takerDelivered, ERC20_USDC_DECIMALS);
        const expiry = new Date(Number(trade.expiryDate) * 1000);
        const isExpired = expiry.getTime() < Date.now();

        // Calculate implied FX rate
        const baseNum = parseFloat(baseAmt);
        const quoteNum = parseFloat(quoteAmt);
        const rate = baseNum > 0 ? (quoteNum / baseNum).toFixed(6) : "N/A";

        s.succeed(`Trade #${tradeId}`);
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Pair", `${baseSymbol} / ${quoteSymbol}`],
            ["Base Amount", `${parseFloat(baseAmt).toFixed(6)} ${baseSymbol}`],
            ["Quote Amount", `${parseFloat(quoteAmt).toFixed(6)} ${quoteSymbol}`],
            ["Implied Rate", `1 ${baseSymbol} = ${rate} ${quoteSymbol}`],
            ["Maker", trade.maker],
            ["Taker", trade.taker],
            ["Maker Signer", trade.makerSigner],
            ["Maker Fee", `${parseFloat(makerFee).toFixed(6)}`],
            ["Taker Fee", `${parseFloat(takerFee).toFixed(6)}`],
            ["Maker Delivered", `${parseFloat(makerDel).toFixed(6)} ${baseSymbol}`],
            ["Taker Delivered", `${parseFloat(takerDel).toFixed(6)} ${quoteSymbol}`],
            ["Status", TRADE_STATUS_LABELS[trade.status] ?? `Unknown (${trade.status})`],
            ["Maker Funding", FUNDING_STATUS_LABELS[trade.makerFundingStatus] ?? `Unknown (${trade.makerFundingStatus})`],
            ["Taker Funding", FUNDING_STATUS_LABELS[trade.takerFundingStatus] ?? `Unknown (${trade.takerFundingStatus})`],
            ["Expiry", `${expiry.toISOString()}${isExpired ? " (EXPIRED)" : ""}`],
          ]
        );

        log.newline();
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/address/${FX_ESCROW}`);
      } catch (err) {
        s.fail(`Failed to fetch trade #${tradeId}`);
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  fx.command("trades")
    .description("List recent FX trades")
    .option("-n, --count <number>", "Number of trades to show", "10")
    .action(async (opts: { count: string }) => {
      const count = parseInt(opts.count, 10);
      if (isNaN(count) || count < 1) {
        log.error("Count must be a positive integer");
        process.exitCode = 1;
        return;
      }

      const s = spinner("Fetching trades...");
      try {
        const lastId = (await fxRead("lastTradeId")) as bigint;
        const total = Number(lastId);

        if (total === 0) {
          s.succeed("No trades found");
          return;
        }

        const start = Math.max(1, total - count + 1);
        const rows: string[][] = [];

        for (let i = total; i >= start; i--) {
          const result = await fxRead("getTradeDetails", [BigInt(i)]);
          const trade = parseTrade(result);

          const baseSymbol = resolveTokenSymbol(trade.baseToken);
          const quoteSymbol = resolveTokenSymbol(trade.quoteToken);
          const baseAmt = parseFloat(formatUnits(trade.baseAmount, ERC20_USDC_DECIMALS)).toFixed(2);
          const quoteAmt = parseFloat(formatUnits(trade.quoteAmount, ERC20_USDC_DECIMALS)).toFixed(2);
          const status = TRADE_STATUS_LABELS[trade.status] ?? String(trade.status);

          rows.push([
            String(i),
            `${baseSymbol}/${quoteSymbol}`,
            `${baseAmt} ${baseSymbol}`,
            `${quoteAmt} ${quoteSymbol}`,
            status,
            `${trade.maker.slice(0, 6)}...${trade.maker.slice(-4)}`,
            `${trade.taker.slice(0, 6)}...${trade.taker.slice(-4)}`,
          ]);
        }

        s.succeed(`${total} total trades (showing last ${rows.length})`);
        log.newline();

        table(
          ["ID", "Pair", "Base", "Quote", "Status", "Maker", "Taker"],
          rows
        );

        log.newline();
        log.dim(`Details: arc fx trade <id>`);
      } catch (err) {
        s.fail("Failed to fetch trades");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  fx.command("breach")
    .description("Declare an FX trade as breached (counterparty failed to deliver)")
    .argument("<id>", "Trade ID to breach")
    .action(async (id: string) => {
      const tradeId = parseInt(id, 10);
      if (isNaN(tradeId) || tradeId < 1) {
        log.error("Trade ID must be a positive integer");
        process.exitCode = 1;
        return;
      }

      const s = spinner(`Fetching trade #${tradeId}...`);
      try {
        // Show trade details first
        const result = await fxRead("getTradeDetails", [BigInt(tradeId)]);
        const trade = parseTrade(result);

        const status = TRADE_STATUS_LABELS[trade.status] ?? String(trade.status);
        if (trade.status !== 1) {
          s.fail(`Trade #${tradeId} cannot be breached (status: ${status})`);
          log.warn("Only Active trades can be breached.");
          process.exitCode = 1;
          return;
        }

        const expiry = new Date(Number(trade.expiryDate) * 1000);
        if (expiry.getTime() > Date.now()) {
          s.fail(`Trade #${tradeId} has not expired yet`);
          log.warn(`Expiry: ${expiry.toISOString()}`);
          log.dim("Trades can only be breached after the expiry date.");
          process.exitCode = 1;
          return;
        }

        log.title("Breach Trade");
        log.label("Trade ID", String(tradeId));
        log.label("Pair", `${resolveTokenSymbol(trade.baseToken)} / ${resolveTokenSymbol(trade.quoteToken)}`);
        log.label("Status", status);
        log.label("Expired", expiry.toISOString());
        log.newline();

        s.text = "Submitting breach...";
        const hash = await callContract({
          address: FX_ESCROW,
          abi: fxAbi as unknown as Abi,
          functionName: "breach",
          args: [BigInt(tradeId)],
        });

        const receipt = await waitForReceipt(hash);

        s.succeed("Trade breached");
        log.newline();

        table(
          ["Field", "Value"],
          [
            ["Trade ID", String(tradeId)],
            ["Tx Hash", hash],
            ["Block", receipt.blockNumber.toString()],
          ]
        );
      } catch (err) {
        s.fail("Breach failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  fx.command("balances")
    .description("Check maker/taker balances for trade IDs")
    .argument("<ids...>", "Trade IDs (space-separated)")
    .action(async (ids: string[]) => {
      const tradeIds = ids.map((id) => {
        const n = parseInt(id, 10);
        if (isNaN(n) || n < 1) {
          log.error(`Invalid trade ID: ${id}`);
          process.exitCode = 1;
          return 0n;
        }
        return BigInt(n);
      });

      if (process.exitCode === 1) return;

      const s = spinner("Fetching balances...");
      try {
        const [makerBase, takerQuote, makerNet] = await Promise.all([
          fxRead("getMakerTotalBaseBalances", [tradeIds]) as Promise<bigint[]>,
          fxRead("getTakerTotalQuoteBalances", [tradeIds]) as Promise<bigint[]>,
          fxRead("getMakerNetBalances", [tradeIds]) as Promise<bigint[]>,
        ]);

        s.succeed("Trade Balances");
        log.newline();

        const rows: string[][] = [];
        for (let i = 0; i < tradeIds.length; i++) {
          rows.push([
            tradeIds[i].toString(),
            formatUnits(makerBase[i], ERC20_USDC_DECIMALS),
            formatUnits(takerQuote[i], ERC20_USDC_DECIMALS),
            formatUnits(makerNet[i], ERC20_USDC_DECIMALS),
          ]);
        }

        table(
          ["Trade ID", "Maker Base", "Taker Quote", "Maker Net"],
          rows
        );
      } catch (err) {
        s.fail("Failed to fetch balances");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  fx.command("relayer")
    .description("Check if an address is an authorized StableFX relayer")
    .argument("<address>", "Address to check")
    .action(async (address: string) => {
      try {
        const isRelayer = (await fxRead("relayers", [address as `0x${string}`])) as boolean;

        if (isRelayer) {
          log.success(`${address} IS an authorized relayer`);
        } else {
          log.warn(`${address} is NOT an authorized relayer`);
        }
      } catch (err) {
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
