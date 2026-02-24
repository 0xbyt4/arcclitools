import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import {
  createX402Server,
  generateServerTemplate,
  generateRoutesTemplate,
  X402_NETWORKS,
} from "../src/services/x402-server.js";
import { testEndpoint } from "../src/services/x402-client.js";

// --- X402_NETWORKS ---

describe("X402_NETWORKS", () => {
  it("has base-sepolia as a known network", () => {
    expect(X402_NETWORKS["base-sepolia"]).toBeDefined();
    expect(X402_NETWORKS["base-sepolia"].chainId).toBe(84532);
  });

  it("has base mainnet", () => {
    expect(X402_NETWORKS["base"]).toBeDefined();
    expect(X402_NETWORKS["base"].chainId).toBe(8453);
  });

  it("has arc testnet", () => {
    expect(X402_NETWORKS["arc"]).toBeDefined();
    expect(X402_NETWORKS["arc"].chainId).toBe(5042002);
  });

  it("has ethereum mainnet", () => {
    expect(X402_NETWORKS["ethereum"]).toBeDefined();
    expect(X402_NETWORKS["ethereum"].chainId).toBe(1);
  });

  it("all networks have name and chainId", () => {
    for (const [key, net] of Object.entries(X402_NETWORKS)) {
      expect(net.name, `${key} missing name`).toBeDefined();
      expect(net.chainId, `${key} missing chainId`).toBeGreaterThan(0);
    }
  });

  it("has at least 5 networks", () => {
    expect(Object.keys(X402_NETWORKS).length).toBeGreaterThanOrEqual(5);
  });
});

// --- generateServerTemplate ---

describe("generateServerTemplate", () => {
  it("generates valid template with default config", () => {
    const template = generateServerTemplate({
      port: 3000,
      price: "0.01",
      payTo: "0x1234567890123456789012345678901234567890",
      network: "base-sepolia",
    });

    expect(template).toContain('import express from "express"');
    expect(template).toContain("paymentMiddlewareFromConfig");
    expect(template).toContain("ExactEvmScheme");
    expect(template).toContain("0x1234567890123456789012345678901234567890");
    expect(template).toContain('"0.01"');
    expect(template).toContain("eip155:84532");
    expect(template).toContain("3000");
  });

  it("uses arc network when specified", () => {
    const template = generateServerTemplate({
      port: 4000,
      price: "0.05",
      payTo: "0xaaaa000000000000000000000000000000000000",
      network: "arc",
    });

    expect(template).toContain("eip155:5042002");
  });

  it("includes /protected and /health endpoints", () => {
    const template = generateServerTemplate({
      port: 3000,
      price: "0.01",
      payTo: "0x1234567890123456789012345678901234567890",
    });

    expect(template).toContain('"/protected"');
    expect(template).toContain('"/health"');
    expect(template).toContain("Access granted");
  });

  it("uses raw eip155 format when provided", () => {
    const template = generateServerTemplate({
      port: 3000,
      price: "0.01",
      payTo: "0x1234567890123456789012345678901234567890",
      network: "eip155:42161",
    });

    expect(template).toContain("eip155:42161");
  });

  it("throws for unknown network name", () => {
    expect(() =>
      generateServerTemplate({
        port: 3000,
        price: "0.01",
        payTo: "0x1234567890123456789012345678901234567890",
        network: "invalid-network",
      })
    ).toThrow("Unknown network: invalid-network");
  });

  it("defaults to arc testnet when no network specified", () => {
    const template = generateServerTemplate({
      port: 3000,
      price: "0.01",
      payTo: "0x1234567890123456789012345678901234567890",
    });

    expect(template).toContain("eip155:5042002");
  });

  it("resolves all known networks", () => {
    const networks = ["base-sepolia", "base", "arc", "ethereum", "sepolia", "polygon", "avalanche"];
    for (const network of networks) {
      expect(() =>
        generateServerTemplate({
          port: 3000,
          price: "0.01",
          payTo: "0x1234567890123456789012345678901234567890",
          network,
        })
      ).not.toThrow();
    }
  });
});

// --- generateRoutesTemplate ---

describe("generateRoutesTemplate", () => {
  it("generates default routes when empty array", () => {
    const template = generateRoutesTemplate([]);
    const parsed = JSON.parse(template);

    expect(parsed.routes).toBeDefined();
    expect(parsed.routes.length).toBe(2);
    expect(parsed.routes[0].path).toBe("/api/data");
    expect(parsed.routes[1].path).toBe("/api/premium");
  });

  it("uses provided routes", () => {
    const routes = [
      { path: "/api/v1", price: "0.10", description: "V1 API" },
      { path: "/api/v2", price: "0.20" },
    ];
    const template = generateRoutesTemplate(routes);
    const parsed = JSON.parse(template);

    expect(parsed.routes.length).toBe(2);
    expect(parsed.routes[0].path).toBe("/api/v1");
    expect(parsed.routes[0].price).toBe("0.10");
    expect(parsed.routes[0].description).toBe("V1 API");
    expect(parsed.routes[1].path).toBe("/api/v2");
  });

  it("generates valid JSON", () => {
    const template = generateRoutesTemplate([]);
    expect(() => JSON.parse(template)).not.toThrow();
  });

  it("each default route has path, price, description", () => {
    const parsed = JSON.parse(generateRoutesTemplate([]));
    for (const route of parsed.routes) {
      expect(route.path).toBeDefined();
      expect(route.price).toBeDefined();
      expect(route.description).toBeDefined();
    }
  });
});

// --- createX402Server (health endpoint only - no facilitator needed) ---

describe("createX402Server", () => {
  let server: http.Server;
  const port = 19402;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        const app = createX402Server({
          port,
          price: "0.01",
          payTo: "0x1234567890123456789012345678901234567890",
          network: "base-sepolia",
        });
        server = app.listen(port, resolve);
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      })
  );

  it("health endpoint returns ok", async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.x402).toBe(true);
    expect(body.network).toBe("eip155:84532");
  });

  it("health endpoint returns JSON content-type", async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.headers.get("content-type")).toContain("application/json");
  });

  it("unknown route returns 404", async () => {
    const res = await fetch(`http://localhost:${port}/nonexistent`);
    expect(res.status).toBe(404);
  });
});

// --- createX402Server with custom routes ---

describe("createX402Server with custom routes", () => {
  let server: http.Server;
  const port = 19404;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        const app = createX402Server({
          port,
          price: "0.01",
          payTo: "0x1234567890123456789012345678901234567890",
          network: "base-sepolia",
          routes: [
            { path: "/api/data", price: "0.02", description: "Data endpoint" },
            { path: "/api/premium", price: "0.10", description: "Premium" },
          ],
        });
        server = app.listen(port, resolve);
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      })
  );

  it("custom route /api/data responds", async () => {
    const res = await fetch(`http://localhost:${port}/api/data`);
    // Either 200 (no facilitator check) or 402 (payment required)
    // The route should be registered either way
    expect([200, 402]).toContain(res.status);
  });

  it("custom route /api/premium responds", async () => {
    const res = await fetch(`http://localhost:${port}/api/premium`);
    expect([200, 402]).toContain(res.status);
  });

  it("health endpoint still works with custom routes", async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("default /protected is not registered when custom routes used", async () => {
    const res = await fetch(`http://localhost:${port}/protected`);
    expect(res.status).toBe(404);
  });
});

// --- testEndpoint (against a mock HTTP server) ---

describe("testEndpoint", () => {
  let mockServer: http.Server;
  const mockPort = 19403;

  beforeAll(
    () =>
      new Promise<void>((resolve) => {
        mockServer = http.createServer((req, res) => {
          if (req.url === "/free") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ data: "free" }));
          } else if (req.url === "/paid") {
            res.writeHead(402, {
              "Content-Type": "application/json",
              "x-payment-amount": "0.01",
            });
            res.end(JSON.stringify({ error: "payment required" }));
          } else if (req.url === "/paid-legacy") {
            res.writeHead(402, {
              "Content-Type": "application/json",
              "x-price": "0.05",
            });
            res.end("{}");
          } else {
            res.writeHead(404);
            res.end();
          }
        });
        mockServer.listen(mockPort, resolve);
      })
  );

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        mockServer.close(() => resolve());
      })
  );

  it("detects free endpoint (200)", async () => {
    const result = await testEndpoint(`http://localhost:${mockPort}/free`);
    expect(result.status).toBe(200);
    expect(result.requiresPayment).toBe(false);
    expect(result.price).toBeUndefined();
  });

  it("detects paid endpoint (402)", async () => {
    const result = await testEndpoint(`http://localhost:${mockPort}/paid`);
    expect(result.status).toBe(402);
    expect(result.requiresPayment).toBe(true);
    expect(result.price).toBe("0.01");
  });

  it("reads x-price header (legacy)", async () => {
    const result = await testEndpoint(`http://localhost:${mockPort}/paid-legacy`);
    expect(result.status).toBe(402);
    expect(result.requiresPayment).toBe(true);
    expect(result.price).toBe("0.05");
  });

  it("returns headers object", async () => {
    const result = await testEndpoint(`http://localhost:${mockPort}/free`);
    expect(result.headers).toBeDefined();
    expect(result.headers["content-type"]).toContain("application/json");
  });

  it("handles 404", async () => {
    const result = await testEndpoint(`http://localhost:${mockPort}/missing`);
    expect(result.status).toBe(404);
    expect(result.requiresPayment).toBe(false);
  });
});
