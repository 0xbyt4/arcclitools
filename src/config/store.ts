import Conf from "conf";
import type { ConfigStore, ConfigKey } from "../types/index.js";
import { CONFIG_KEYS } from "./constants.js";

const config = new Conf<ConfigStore>({
  projectName: "arc-cli",
  configName: "arcrc",
});

export function getConfig(key: ConfigKey): string | number | undefined {
  return config.get(key);
}

export function setConfig(key: ConfigKey, value: string | number): void {
  config.set(key, value);
}

export function getAllConfig(): Partial<ConfigStore> {
  const result: Partial<ConfigStore> = {};
  for (const key of CONFIG_KEYS) {
    const val = config.get(key);
    if (val !== undefined) {
      (result as Record<string, unknown>)[key] = val;
    }
  }
  return result;
}

export function resetConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}

export function hasConfig(key: ConfigKey): boolean {
  return config.has(key);
}
