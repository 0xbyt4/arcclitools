import { Command } from "commander";
import { getConfig, setConfig, getAllConfig, resetConfig, getConfigPath } from "../config/store.js";
import { CONFIG_KEYS } from "../config/constants.js";
import { log, table } from "../utils/logger.js";
import { maskSecret } from "../utils/formatter.js";
import { promptConfirm } from "../utils/prompts.js";
import type { ConfigKey } from "../types/index.js";

const KEY_MAP: Record<string, ConfigKey> = {
  "api-key": "apiKey",
  "entity-secret": "entitySecret",
  "rpc-url": "rpcUrl",
  "network": "network",
  "private-key": "privateKey",
  "x402-port": "x402Port",
  "x402-price": "x402Price",
};

const SENSITIVE_KEYS: ConfigKey[] = ["apiKey", "entitySecret", "privateKey"];

function resolveKey(key: string): ConfigKey {
  const resolved = KEY_MAP[key] || key;
  if (!CONFIG_KEYS.includes(resolved as (typeof CONFIG_KEYS)[number])) {
    throw new Error(
      `Unknown config key: ${key}\nValid keys: ${Object.keys(KEY_MAP).join(", ")}`,
    );
  }
  return resolved as ConfigKey;
}

function formatValue(key: ConfigKey, value: unknown): string {
  if (value === undefined || value === null) return "(not set)";
  const strValue = String(value);
  if (SENSITIVE_KEYS.includes(key)) return maskSecret(strValue);
  return strValue;
}

export function registerConfigCommand(program: Command): void {
  const config = program
    .command("config")
    .description("Manage CLI configuration");

  config
    .command("set <key> <value>")
    .description("Set a configuration value")
    .action((key: string, value: string) => {
      try {
        const resolved = resolveKey(key);
        const finalValue = resolved === "x402Port" ? Number(value) : value;
        setConfig(resolved, finalValue);
        log.success(`${key} = ${SENSITIVE_KEYS.includes(resolved) ? maskSecret(value) : value}`);
      } catch (err) {
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  config
    .command("get <key>")
    .description("Get a configuration value")
    .action((key: string) => {
      try {
        const resolved = resolveKey(key);
        const value = getConfig(resolved);
        if (value === undefined) {
          log.warn(`${key} is not set`);
        } else {
          console.log(formatValue(resolved, value));
        }
      } catch (err) {
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  config
    .command("list")
    .description("List all configuration values")
    .action(() => {
      const all = getAllConfig();
      const entries = Object.entries(all);

      if (entries.length === 0) {
        log.warn("No configuration values set");
        log.dim(`Config path: ${getConfigPath()}`);
        return;
      }

      log.title("Configuration");
      table(
        ["Key", "Value"],
        entries.map(([k, v]) => [k, formatValue(k as ConfigKey, v)]),
      );
      log.newline();
      log.dim(`Config path: ${getConfigPath()}`);
    });

  config
    .command("reset")
    .description("Reset all configuration to defaults")
    .action(async () => {
      const confirmed = await promptConfirm("Reset all configuration?");
      if (confirmed) {
        resetConfig();
        log.success("Configuration reset");
      } else {
        log.info("Reset cancelled");
      }
    });
}
