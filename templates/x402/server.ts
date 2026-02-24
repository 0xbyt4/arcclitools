import express from "express";
import { paymentMiddleware } from "@x402/express";

const app = express();
app.use(express.json());

// x402 facilitator endpoint
const facilitatorUrl = "https://x402.org/facilitator";

// Configuration - update these values
const payTo = "YOUR_WALLET_ADDRESS";
const network = "eip155:5042002"; // Arc Testnet

// Protected route - requires x402 payment
app.use(
  "/protected",
  paymentMiddleware(facilitatorUrl, {
    payTo,
    network,
    amount: "0.01",
    resource: "/protected",
    description: "Protected resource requiring USDC payment",
  }),
);

app.get("/protected", (_req, res) => {
  res.json({
    message: "Access granted! You paid with x402.",
    timestamp: new Date().toISOString(),
  });
});

// Health check (no payment required)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", x402: true });
});

const PORT = process.env.X402_PORT || 3000;
app.listen(PORT, () => {
  console.log(`x402 server running on http://localhost:${PORT}`);
  console.log(`Protected endpoint: http://localhost:${PORT}/protected`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
