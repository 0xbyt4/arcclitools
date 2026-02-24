import { Command } from "commander";
import { log, table, spinner } from "../utils/logger.js";
import { promptAddress } from "../utils/prompts.js";
import { validateUrl, requireValidAddress } from "../utils/validator.js";
import { payForResource, testEndpoint } from "../services/x402-client.js";
import {
  createX402Server,
  generateServerTemplate,
  generateRoutesTemplate,
  X402_NETWORKS,
} from "../services/x402-server.js";
import { getX402Port, getX402Price } from "../config/env.js";
import type { X402RouteConfig } from "../types/index.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const networkChoices = Object.keys(X402_NETWORKS).join(", ");

export function registerX402Command(program: Command): void {
  const x402 = program.command("x402").description("x402 HTTP payment protocol");

  x402
    .command("server")
    .description("Start an x402 payment server")
    .option("-p, --port <port>", "Server port")
    .option("--price <amount>", "Default price per request (USDC)")
    .option("--pay-to <address>", "Payment recipient address")
    .option("--routes <file>", "Route configuration file (JSON)")
    .option(
      "-n, --network <network>",
      `Network for x402 payments (${networkChoices})`,
      "base-sepolia"
    )
    .action(async (opts) => {
      const port = opts.port ? Number(opts.port) : getX402Port();
      const price = opts.price || getX402Price();
      const payTo = opts.payTo || (await promptAddress("Payment recipient address:"));

      requireValidAddress(payTo, "payment recipient");

      let routes: X402RouteConfig[] | undefined;
      if (opts.routes) {
        try {
          const routeFile = readFileSync(opts.routes, "utf-8");
          const parsed = JSON.parse(routeFile);
          routes = parsed.routes;
        } catch (err) {
          log.error(`Failed to read routes file: ${(err as Error).message}`);
          process.exitCode = 1;
          return;
        }
      }

      const network = opts.network;
      const app = createX402Server({ port, price, payTo, routes, network });

      app.listen(port, () => {
        const networkInfo = X402_NETWORKS[network];
        const networkLabel = networkInfo
          ? `${networkInfo.name} (eip155:${networkInfo.chainId})`
          : network;

        log.title("x402 Payment Server");
        log.label("Port", String(port));
        log.label("Price", `$${price} USDC per request`);
        log.label("Pay To", payTo);
        log.label("Network", networkLabel);
        log.newline();

        if (routes && routes.length > 0) {
          log.title("Protected Routes");
          table(
            ["Path", "Price", "Description"],
            routes.map((r) => [r.path, `$${r.price}`, r.description || ""])
          );
        } else {
          log.info(`Protected endpoint: http://localhost:${port}/protected`);
        }

        log.info(`Health check: http://localhost:${port}/health`);
        log.newline();
        log.dim("Press Ctrl+C to stop the server");
      });
    });

  x402
    .command("pay <url>")
    .description("Make a payment to an x402 endpoint")
    .action(async (url: string) => {
      if (!validateUrl(url)) {
        log.error("Invalid URL");
        process.exitCode = 1;
        return;
      }

      const s = spinner(`Paying for ${url}...`);
      try {
        const response = await payForResource(url);
        const body = await response.text();
        s.succeed(`Payment successful (${response.status})`);

        log.newline();
        table(
          ["Field", "Value"],
          [
            ["URL", url],
            ["Status", String(response.status)],
            ["Content-Type", response.headers.get("content-type") || "N/A"],
          ]
        );

        log.newline();
        log.title("Response Body");
        try {
          console.log(JSON.stringify(JSON.parse(body), null, 2));
        } catch {
          console.log(body);
        }
      } catch (err) {
        s.fail("Payment failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  x402
    .command("test <url>")
    .description("Test an x402 endpoint (check if it requires payment)")
    .action(async (url: string) => {
      if (!validateUrl(url)) {
        log.error("Invalid URL");
        process.exitCode = 1;
        return;
      }

      const s = spinner(`Testing ${url}...`);
      try {
        const result = await testEndpoint(url);
        s.succeed("Test complete");

        log.newline();
        table(
          ["Field", "Value"],
          [
            ["URL", url],
            ["HTTP Status", String(result.status)],
            ["Requires Payment", result.requiresPayment ? "Yes (402)" : "No"],
            ...(result.price ? [["Price", `$${result.price} USDC`]] : []),
          ]
        );

        if (result.requiresPayment) {
          log.newline();
          log.info("Use 'arc x402 pay <url>' to make a payment and access the resource.");
        }
      } catch (err) {
        s.fail("Test failed");
        log.error((err as Error).message);
        process.exitCode = 1;
      }
    });

  x402
    .command("init")
    .description("Initialize x402 config and templates in current directory")
    .option("--pay-to <address>", "Payment recipient address")
    .option(
      "-n, --network <network>",
      `Network for x402 payments (${networkChoices})`,
      "base-sepolia"
    )
    .action(async (opts) => {
      const payTo = opts.payTo || (await promptAddress("Payment recipient address:"));
      requireValidAddress(payTo, "payment recipient");

      const cwd = process.cwd();
      const x402Dir = join(cwd, "x402");

      if (!existsSync(x402Dir)) {
        mkdirSync(x402Dir, { recursive: true });
      }

      const serverTemplate = generateServerTemplate({
        port: getX402Port(),
        price: getX402Price(),
        payTo,
        network: opts.network,
      });

      const routesTemplate = generateRoutesTemplate([]);

      const serverPath = join(x402Dir, "server.ts");
      const routesPath = join(x402Dir, "routes.json");

      writeFileSync(serverPath, serverTemplate, "utf-8");
      writeFileSync(routesPath, routesTemplate, "utf-8");

      log.success("x402 templates created");
      log.newline();
      log.label("Server template", serverPath);
      log.label("Routes config", routesPath);
      log.newline();
      log.dim("Edit routes.json to configure your protected endpoints.");
      log.dim("Run 'npx tsx x402/server.ts' to start the server.");
    });
}
