# Transfer USDC or EURC

> Learn how to transfer USDC or EURC from one wallet address to another

In this tutorial, you'll programmatically transfer USDC or EURC from one wallet
address to another on the Arc testnet with
[Circle Dev-Controlled Wallets](https://developers.circle.com/wallets/dev-controlled).

## Prerequisites

Before you begin, make sure you have:

1. A [Circle Developer Console](https://console.circle.com) account
2. An API key created in the Console:
   **Keys -> Create a key -> API key -> Standard Key**
3. Your
   [Entity Secret registered](https://developers.circle.com/wallets/dev-controlled/register-entity-secret)

## Step 1: Set up your project

### 1.1. Create a new project

```shell
mkdir transfer-funds
cd transfer-funds
npm init -y
npm pkg set type=module
```

### 1.2. Install dependencies

```shell
npm install @circle-fin/developer-controlled-wallets
```

### 1.3 Configure environment variables

```shell
echo "CIRCLE_API_KEY={YOUR_API_KEY}
CIRCLE_ENTITY_SECRET={YOUR_ENTITY_SECRET}" > .env
```

> Important: These are sensitive credentials. Do not commit them to version
> control or share them publicly.

## Step 2: Set up your wallets

### 2.1. Create wallets

```ts
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: "<YOUR_API_KEY>",
  entitySecret: "<YOUR_ENTITY_SECRET>",
});

// Create a wallet set
const walletSetResponse = await client.createWalletSet({
  name: "Wallet Set 1",
});

// Create 2 wallets on Arc Testnet
const walletsResponse = await client.createWallets({
  blockchains: ["ARC-TESTNET"],
  count: 2,
  walletSetId: walletSetResponse.data?.walletSet?.id ?? "",
});
```

### 2.2. Fund a wallet with testnet stablecoins

Obtain testnet USDC or EURC from the [Circle Faucet](https://faucet.circle.com/)
or the [Console Faucet](https://console.circle.com/faucet).

### 2.3. Check the wallet balances

```ts
const response = await client.getWalletTokenBalance({
  id: "<WALLET_ID>",
});
```

## Step 3: Transfer USDC / EURC

### 3.1 Setup the transfer script and execute the transfer

#### USDC Transfer

```ts
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: "<YOUR_API_KEY>",
  entitySecret: "<YOUR_ENTITY_SECRET>",
});

const transferResponse = await client.createTransaction({
  amount: ["0.1"], // Transfer 0.1 USDC
  destinationAddress: "<RECIPIENT_ADDRESS>",
  tokenAddress: "0x3600000000000000000000000000000000000000", // USDC contract address on Arc Testnet
  blockchain: "ARC-TESTNET",
  walletAddress: "<SENDER_ADDRESS>",
  fee: {
    type: "level",
    config: {
      feeLevel: "MEDIUM",
    },
  },
});
console.log(transferResponse.data);
```

#### EURC Transfer

```ts
const transferResponse = await client.createTransaction({
  amount: ["0.1"], // Transfer 0.1 EURC
  destinationAddress: "<RECIPIENT_ADDRESS>",
  tokenAddress: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", // EURC contract address on Arc Testnet
  blockchain: "ARC-TESTNET",
  walletAddress: "<SENDER_ADDRESS>",
  fee: {
    type: "level",
    config: {
      feeLevel: "MEDIUM",
    },
  },
});
```

### 3.2 Verify the status of the transfer

```ts
const response = await client.getTransaction({
  id: "<TRANSACTION_ID>",
});
console.log(response.data);
```

You can also copy the transaction hash (`txHash`) and look it up on the
[Arc Testnet explorer](https://testnet.arcscan.app/).

---

## Summary

After completing this tutorial, you've successfully:

* Created dev-controlled wallets on Arc Testnet
* Funded your wallet with testnet tokens
* Transferred USDC or EURC from one wallet to another
