import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";
import type { RoutesConfig } from "@x402/core/server";
import type { X402ServerConfig, X402RouteConfig } from "../types/index.js";
import { ARC_TESTNET } from "../config/constants.js";

function buildRoutesConfig(config: X402ServerConfig): RoutesConfig {
  const network = `eip155:${ARC_TESTNET.chainId}` as const;

  if (config.routes && config.routes.length > 0) {
    const routes: Record<string, { accepts: { scheme: string; payTo: string; price: string; network: string } }> = {};
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
    return routes as unknown as RoutesConfig;
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
  } as unknown as RoutesConfig;
}

export function createX402Server(config: X402ServerConfig) {
  const app = express();
  app.use(express.json());

  const routesConfig = buildRoutesConfig(config);

  app.use(paymentMiddlewareFromConfig(routesConfig));

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
    res.json({ status: "ok", x402: true });
  });

  return app;
}

export function generateServerTemplate(config: X402ServerConfig): string {
  return `import express from "express";
import { paymentMiddlewareFromConfig } from "@x402/express";

const app = express();
app.use(express.json());

const routes = {
  "/protected": {
    accepts: {
      scheme: "exact",
      payTo: "${config.payTo}",
      price: "${config.price}",
      network: "eip155:${ARC_TESTNET.chainId}",
    },
  },
};

app.use(paymentMiddlewareFromConfig(routes));

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
      routes: routes.length > 0
        ? routes
        : [
            { path: "/api/data", price: "0.01", description: "Access to data API" },
            { path: "/api/premium", price: "0.05", description: "Premium API access" },
          ],
    },
    null,
    2,
  );
}
