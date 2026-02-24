# Bridge USDC to Arc

> Learn how to bridge USDC to Arc via CCTP with Bridge Kit

> [Cross-Chain Transfer Protocol (CCTP)](https://www.circle.com/cross-chain-transfer-protocol) is a
> permissionless onchain utility that facilitates USDC transfers securely
> between supported blockchains via native burning and minting. For more info,
> visit the [CCTP](https://developers.circle.com/cctp) docs.

In this tutorial, you'll use
[Circle's Bridge Kit](https://developers.circle.com/bridge-kit) to
programmatically transfer USDC from an EVM chain (for example, Ethereum Sepolia)
or Solana Devnet to Arc Testnet with
[Circle Dev-Controlled Wallets](https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet).

## Prerequisites

Before you begin, make sure you have:

1. Installed [Node.js v22+](https://nodejs.org/)
2. A [Circle Developer Console](https://console.circle.com) account
3. An API key created in the Console:
   **Keys -> Create a key -> API key -> Standard Key**
4. Your
   [Entity Secret registered](https://developers.circle.com/wallets/dev-controlled/register-entity-secret)

## Step 1: Set up your project

### 1.1. Create a new project

```shell
mkdir crosschain-transfer
cd crosschain-transfer
npm init -y
npm pkg set type=module
npm pkg set scripts.start="tsx --env-file=.env index.ts"
```

Install dependencies:

```shell
npm install @circle-fin/bridge-kit @circle-fin/adapter-circle-wallets
npm install --save-dev tsx typescript @types/node
```

### 1.2. Initialize and configure the project

```bash
npx tsc --init
```

Then edit `tsconfig.json`:

```bash
cat <<'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["node"]
  }
}
EOF
```

### 1.3 Configure environment variables

Create a `.env` file:

```bash
echo "CIRCLE_API_KEY={YOUR_API_KEY}
CIRCLE_ENTITY_SECRET={YOUR_ENTITY_SECRET}
EVM_WALLET_ADDRESS={YOUR_EVM_WALLET_ADDRESS}
SOLANA_WALLET_ADDRESS={YOUR_SOLANA_WALLET_ADDRESS}" > .env
```

> Important: The API key and Entity Secret are sensitive credentials. Do not
> commit them to version control or share them publicly.

## Step 2: Set up your wallets

### 2.1. Create wallets

```shell
npm install @circle-fin/developer-controlled-wallets
```

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

// Create wallets on Arc Testnet and Solana Devnet
const walletsResponse = await client.createWallets({
  blockchains: ["ARC-TESTNET", "SOL-DEVNET"],
  count: 1,
  walletSetId: walletSetResponse.data?.walletSet?.id ?? "",
});
```

### 2.2. Fund a wallet with testnet tokens

Obtain testnet USDC from the [Circle Faucet](https://faucet.circle.com/) and
native tokens from the [Console Faucet](https://console.circle.com/faucet).

### 2.3. Check the wallet's balance

```ts
const response = await client.getWalletTokenBalance({
  id: "<WALLET_ID>",
});
```

## Step 3: Bridge USDC

### 3.1. Create the script

Create an `index.ts` file. Example for Ethereum Sepolia to Arc Testnet:

```typescript
import { BridgeKit } from "@circle-fin/bridge-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { inspect } from "util";

const kit = new BridgeKit();

const bridgeUSDC = async () => {
  try {
    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });

    console.log("---------------Starting Bridging---------------");

    const result = await kit.bridge({
      from: {
        adapter,
        chain: "Ethereum_Sepolia",
        address: process.env.EVM_WALLET_ADDRESS!,
      },
      to: {
        adapter,
        chain: "Arc_Testnet",
        address: process.env.EVM_WALLET_ADDRESS!,
      },
      amount: "1.00",
    });

    console.log("RESULT", inspect(result, false, null, true));
  } catch (err) {
    console.log("ERROR", inspect(err, false, null, true));
  }
};

void bridgeUSDC();
```

Supported source chains: Arbitrum_Sepolia, Avalanche_Fuji, Base_Sepolia,
Ethereum_Sepolia, Optimism_Sepolia, Polygon_Amoy_Testnet, Solana_Devnet,
Unichain_Sepolia.

### 3.2. Run the script

```shell
npm run start
```

> For blockchains other than Arc, you will need native tokens to pay for gas.

### 3.3. Verify the transfer

After the script finishes, locate the returned `steps` array in the terminal
output. Each transaction step includes an `explorerUrl` field.

The four steps are: Approve, Burn, Fetch Attestation, Mint.

---

## Summary

After completing this tutorial, you've successfully:

* Created dev-controlled wallets
* Funded your wallet with testnet USDC
* Bridged USDC from one chain to another
