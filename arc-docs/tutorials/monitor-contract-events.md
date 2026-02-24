# Monitor contract events

> Track onchain activity by monitoring contract events.

Track contract events and get event logs with the Circle Contracts API.

## Prerequisites

Complete the [Deploy contracts](/arc/tutorials/deploy-contracts) tutorial first.
You'll need a deployed contract.

## Set up npm scripts

```shell
npm pkg set scripts.webhook="tsx webhook-receiver.ts"
npm pkg set scripts.import-contract="tsx --env-file=.env import-contract.ts"
npm pkg set scripts.create-monitor="tsx --env-file=.env create-monitor.ts"
npm pkg set scripts.get-event-logs="tsx --env-file=.env get-event-logs.ts"
```

## Step 1: Set up a webhook endpoint

Event monitors send real-time updates to your webhook endpoint when events happen.

**Option A: webhook.site**

1. Visit [webhook.site](https://webhook.site)
2. Copy your unique webhook URL

**Option B: ngrok**

1. Install `ngrok` from [ngrok.com](https://ngrok.com)
2. Create a webhook receiver script:

```ts
// webhook-receiver.ts
import express, { Request, Response } from "express";

const app = express();
app.use(express.json());

app.post("/webhook", (req: Request, res: Response) => {
  console.log("Received webhook:");
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).json({ received: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Webhook receiver listening on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/webhook`);
});
```

3. Start the webhook receiver: `npm run webhook`
4. In a separate terminal: `ngrok http 3000`
5. Copy the HTTPS forwarding URL

## Step 2: Register your webhook in Console

1. Go to [Developer Console](https://console.circle.com)
2. Navigate to **Webhooks** (left sidebar)
3. Click **Add a webhook**
4. Enter your webhook URL and create the webhook

## Step 3: Import an existing contract (optional)

If you already have a deployed contract and want to monitor its events:

```ts
// import-contract.ts
import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

const contractClient = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

async function importContract() {
  try {
    const response = await contractClient.importContract({
      blockchain: "ARC-TESTNET",
      address: process.env.CONTRACT_ADDRESS,
      name: "MyContract",
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error importing contract:", error.message);
    throw error;
  }
}

importContract();
```

## Step 4: Create an event monitor

```ts
// create-monitor.ts
import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

const contractClient = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

async function createEventMonitor() {
  try {
    const response = await contractClient.createEventMonitor({
      blockchain: "ARC-TESTNET",
      contractAddress: process.env.CONTRACT_ADDRESS,
      eventSignature: "Transfer(address,address,uint256)",
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error creating event monitor:", error.message);
    throw error;
  }
}

createEventMonitor();
```

## Step 5: Receive webhook notifications

When events occur, Circle sends updates to your endpoint. Example `Transfer` event:

```json
{
  "subscriptionId": "f0332621-a117-4b7b-bdf0-5c61a4681826",
  "notificationId": "5c5eea9f-398f-426f-a4a5-1bdc28b36d2c",
  "notificationType": "contracts.eventLog",
  "notification": {
    "contractAddress": "0x4abcffb90897fe7ce86ed689d1178076544a021b",
    "blockchain": "ARC-TESTNET",
    "txHash": "0xe15d6dbb50178f60930b8a3e3e775f3c022505ea2e351b6c2c2985d2405c8ebc",
    "blockHeight": 22807198,
    "eventSignature": "Transfer(address,address,uint256)",
    "topics": [
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x000000000000000000000000bcf83d3b112cbf43b19904e376dd8dee01fe2758"
    ],
    "data": "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000"
  },
  "timestamp": "2026-01-21T06:53:13.194467201Z",
  "version": 2
}
```

## Step 6: Retrieve event logs

```ts
// get-event-logs.ts
import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

const contractClient = initiateSmartContractPlatformClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

async function getEventLogs() {
  try {
    const response = await contractClient.listEventLogs({
      contractAddress: process.env.CONTRACT_ADDRESS,
      blockchain: "ARC-TESTNET",
      pageSize: 10,
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error fetching event logs:", error.message);
    throw error;
  }
}

getEventLogs();
```

> **Webhooks vs Polling**: Webhooks send real-time updates (push). Polling needs
> periodic API calls (pull). Use webhooks for production and polling for testing.

---

## Summary

After completing this tutorial, you've successfully:

* Set up webhook endpoints using webhook.site or ngrok
* Registered webhooks in the Developer Console
* Created event monitors for specific contract events
* Received real-time webhook updates for contract events
* Retrieved past event logs with the Circle SDK
