import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { promptAddress } from "../utils/prompts.js";
import { validateAddress, validateAmount } from "../utils/validator.js";
import { sendNativeUSDC, sendERC20, waitForReceipt } from "../services/rpc.js";
import { ARC_TESTNET } from "../config/constants.js";
import { resolveToken } from "../utils/tokens.js";

export function registerSendCommand(program: Command): void {
  program
    .command("send")
    .description("Send USDC or ERC-20 tokens on Arc (uses private key from .env)")
    .argument("<amount>", "Amount to send")
    .argument("[to]", "Recipient address")
    .option(
      "-t, --token <token>",
      "Token to send: eurc, usyc, or contract address (default: native USDC)"
    )
    .action(async (amount: string, to: string | undefined, opts: { token?: string }) => {
      if (!validateAmount(amount)) {
        log.error(`Invalid amount: ${amount}`);
        process.exitCode = 1;
        return;
      }

      if (!to) {
        to = await promptAddress("Recipient address:");
      }

      if (!validateAddress(to)) {
        log.error(`Invalid address: ${to}`);
        process.exitCode = 1;
        return;
      }

      const token = resolveToken(opts.token);
      const tokenName = token ? token.name : "USDC";
      const isERC20 = !!token;

      const s = spinner(`Sending ${amount} ${tokenName} to ${to}...`);
      try {
        let hash: `0x${string}`;
        let from: string;

        if (isERC20) {
          ({ hash, from } = await sendERC20({
            to: to as `0x${string}`,
            amount,
            tokenAddress: token.address as `0x${string}`,
            decimals: token.decimals,
          }));
        } else {
          ({ hash, from } = await sendNativeUSDC({
            to: to as `0x${string}`,
            amount,
          }));
        }

        s.text = "Waiting for confirmation...";
        const receipt = await waitForReceipt(hash);
        s.succeed("Transaction confirmed");

        table(
          ["Field", "Value"],
          [
            ["Token", tokenName],
            ["From", from],
            ["To", to],
            ["Amount", `${amount} ${tokenName}`],
            ["Tx Hash", hash],
            ["Status", receipt.status === "success" ? "Confirmed" : "Failed"],
            ["Gas Used", receipt.gasUsed.toString()],
          ]
        );

        log.newline();
        log.dim(`Explorer: ${ARC_TESTNET.explorer}/tx/${hash}`);
      } catch (err) {
        s.fail("Transaction failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });
}
