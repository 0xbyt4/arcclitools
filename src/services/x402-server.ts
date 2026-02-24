import express from "express";
import { paymentMiddlewareFromConfig, type SchemeRegistration } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { RoutesConfig } from "@x402/core/server";
import type { X402ServerConfig, X402RouteConfig } from "../types/index.js";
import { ARC_TESTNET } from "../config/constants.js";

// x402 facilitator supported networks
export const X402_NETWORKS: Record<string, { name: string; chainId: number }> = {
  "base-sepolia": { name: "Base Sepolia", chainId: 84532 },
  base: { name: "Base", chainId: 8453 },
  arc: { name: "Arc Testnet", chainId: ARC_TESTNET.chainId },
  ethereum: { name: "Ethereum", chainId: 1 },
  sepolia: { name: "Sepolia", chainId: 11155111 },
  polygon: { name: "Polygon", chainId: 137 },
  avalanche: { name: "Avalanche", chainId: 43114 },
};

function resolveNetwork(config: X402ServerConfig): `${string}:${string}` {
  if (config.network) {
    const known = X402_NETWORKS[config.network];
    if (known) return `eip155:${known.chainId}` as `${string}:${string}`;
    // Allow raw eip155:XXXX format
    if (config.network.startsWith("eip155:")) return config.network as `${string}:${string}`;
    throw new Error(
      `Unknown network: ${config.network}. Use: ${Object.keys(X402_NETWORKS).join(", ")} or eip155:<chainId>`
    );
  }
  return `eip155:${ARC_TESTNET.chainId}` as `${string}:${string}`;
}

function buildRoutesConfig(config: X402ServerConfig): RoutesConfig {
  const network = resolveNetwork(config);

  if (config.routes && config.routes.length > 0) {
    const routes: Record<
      string,
      {
        accepts: {
          scheme: string;
          payTo: string;
          price: string;
          network: `${string}:${string}`;
        };
      }
    > = {};
    for (const route of config.routes) {
      routes[route.path] = {
        accepts: {
          scheme: "exact",
          payTo: config.payTo,
          price: route.price,
          network,
        },
      };
    }
    return routes as RoutesConfig;
  }

  return {
    "/protected": {
      accepts: {
        scheme: "exact",
        payTo: config.payTo,
        price: config.price,
        network,
      },
    },
  } as RoutesConfig;
}

export function createX402Server(config: X402ServerConfig) {
  const app = express();
  app.use(express.json());

  const routesConfig = buildRoutesConfig(config);
  const network = resolveNetwork(config);

  // Register EVM "exact" scheme for the target network
  const schemes: SchemeRegistration[] = [
    {
      network,
      server: new ExactEvmScheme(),
    },
  ];

  // paymentMiddlewareFromConfig uses the public x402.org facilitator by default
  // Syncs with facilitator on first request to check supported schemes/networks
  app.use(paymentMiddlewareFromConfig(routesConfig, undefined, schemes));

  if (config.routes && config.routes.length > 0) {
    for (const route of config.routes) {
      app.get(route.path, (_req, res) => {
        res.json({
          message: `Access granted to ${route.path}`,
          timestamp: new Date().toISOString(),
        });
      });
    }
  } else {
    app.get("/protected", (_req, res) => {
      res.json({
        message: "Access granted",
        timestamp: new Date().toISOString(),
      });
    });
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", x402: true, network });
  });

  return app;
}

export function generateServerTemplate(config: X402ServerConfig): string {
  const network = resolveNetwork(config);
  return `import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const app = express();
app.use(express.json());

const network = "${network}";

const routes = {
  "/protected": {
    accepts: {
      scheme: "exact",
      payTo: "${config.payTo}",
      price: "${config.price}",
      network,
    },
  },
};

const schemes = [{ network, server: new ExactEvmScheme() }];

app.use(paymentMiddlewareFromConfig(routes, undefined, schemes, undefined, undefined, false));

app.get("/protected", (_req, res) => {
  res.json({ message: "Access granted", timestamp: new Date().toISOString() });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", x402: true });
});

const PORT = ${config.port};
app.listen(PORT, () => {
  console.log(\`x402 server running on http://localhost:\${PORT}\`);
  console.log(\`Protected endpoint: http://localhost:\${PORT}/protected\`);
});
`;
}

export function generateRoutesTemplate(routes: X402RouteConfig[]): string {
  return JSON.stringify(
    {
      routes:
        routes.length > 0
          ? routes
          : [
              { path: "/api/data", price: "0.01", description: "Access to data API" },
              { path: "/api/premium", price: "0.05", description: "Premium API access" },
            ],
    },
    null,
    2
  );
}
