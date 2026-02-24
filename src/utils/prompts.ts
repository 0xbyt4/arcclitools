import { input, select, confirm, password } from "@inquirer/prompts";
import { validateAddress, validateAmount } from "./validator.js";

export async function promptAddress(message = "Enter address:"): Promise<string> {
  return input({
    message,
    validate: (val) => validateAddress(val) || "Invalid Ethereum address",
  });
}

export async function promptAmount(message = "Enter amount:"): Promise<string> {
  return input({
    message,
    validate: (val) => validateAmount(val) || "Must be a positive number",
  });
}

export async function promptText(message: string, defaultValue?: string): Promise<string> {
  return input({ message, default: defaultValue });
}

export async function promptSecret(message: string): Promise<string> {
  return password({ message, mask: "*" });
}

export async function promptSelect<T extends string>(
  message: string,
  choices: { name: string; value: T; description?: string }[],
): Promise<T> {
  return select({ message, choices });
}

export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  return confirm({ message, default: defaultValue });
}

export async function promptToken(): Promise<string> {
  return select({
    message: "Select token:",
    choices: [
      { name: "USDC", value: "USDC", description: "USD Coin" },
      { name: "EURC", value: "EURC", description: "Euro Coin" },
      { name: "USYC", value: "USYC", description: "US Yield Coin" },
    ],
  });
}

export async function promptNetwork(): Promise<string> {
  return select({
    message: "Select network:",
    choices: [
      { name: "Arc Testnet", value: "testnet", description: "Chain ID: 5042002" },
    ],
  });
}
