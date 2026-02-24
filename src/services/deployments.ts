import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

export interface Deployment {
  name: string;
  symbol: string;
  address: string;
  deployer: string;
  txHash: string;
  supply: string;
  decimals: number;
  network: string;
  solFile: string;
  verified: boolean;
  deployedAt: string;
}

function getDeploymentsPath(): string {
  return resolve(process.cwd(), "deployments.json");
}

export function loadDeployments(): Deployment[] {
  const path = getDeploymentsPath();
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function saveDeployment(deployment: Deployment): void {
  const deployments = loadDeployments();
  deployments.push(deployment);
  writeFileSync(getDeploymentsPath(), JSON.stringify(deployments, null, 2) + "\n");
}

export function updateDeployment(address: string, updates: Partial<Deployment>): boolean {
  const deployments = loadDeployments();
  const index = deployments.findIndex(
    (d) => d.address.toLowerCase() === address.toLowerCase()
  );

  if (index === -1) return false;

  deployments[index] = { ...deployments[index], ...updates };
  writeFileSync(getDeploymentsPath(), JSON.stringify(deployments, null, 2) + "\n");
  return true;
}

export function getDeployment(address: string): Deployment | undefined {
  const deployments = loadDeployments();
  return deployments.find(
    (d) => d.address.toLowerCase() === address.toLowerCase()
  );
}
