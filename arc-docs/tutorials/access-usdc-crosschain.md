# Access USDC Crosschain

> Learn how to create a unified USDC balance with Gateway and transfer to wallets on Gateway supported chains

In this tutorial, you'll use
[Circle Gateway](https://developers.circle.com/gateway) to create a
chain-abstracted USDC balance and
[Circle Dev-Controlled Wallets](https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet).

## Prerequisites

Before you begin, make sure you have:

1. Installed [Node.js v22+](https://nodejs.org/)
2. A [Circle Developer Console](https://console.circle.com) account
3. An API key created in the Console:\
   **Keys → Create a key → API key → Standard Key**
4. Your
   [Entity Secret registered](https://developers.circle.com/wallets/dev-controlled/register-entity-secret)
   for your wallet (you need it for the script below)

## Step 1: Set up your project

In this step, you prepare your project and environment.

### 1.1. Create a new project

Create a new directory, navigate to it and initialize a new project.

```shell  theme={null}
# Set up your directory and initialize a Node.js project
mkdir unified-gateway-balance
cd unified-gateway-balance
npm init -y

# Set up module type
npm pkg set type=module

# Add run scripts for deposit, transfer, and check balances
npm pkg set scripts.deposit="tsx --env-file=.env deposit.ts"
npm pkg set scripts.transfer="tsx --env-file=.env transfer.ts"
npm pkg set scripts.balances="tsx --env-file=.env balances.ts"
```

Install the
[Circle Dev-Controlled Wallets SDK](https://www.npmjs.com/package/@circle-fin/developer-controlled-wallets)
and supporting tools. It is also possible to
[call the API directly](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/)
if you can't use the SDK in your project.

```shell  theme={null}
# Install dependencies
npm install @circle-fin/developer-controlled-wallets

# Install dev dependencies
npm install --save-dev tsx typescript @types/node
```

### 1.2. Initialize and configure the project

This command creates a `tsconfig.json` file:

```bash Shell theme={null}
npx tsc --init
```

Then, edit the `tsconfig.json` file:

```bash Shell theme={null}
# Replace the contents of the generated file
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

Create a `.env` file in the project directory with your Circle credentials,
replacing these placeholders with your own credentials:

* `CIRCLE_API_KEY`: your API key should be either environment-prefixed (for
  example, `TEST_API_KEY:abc123:def456` or `LIVE_API_KEY:xyz:uvw`) or
  base64-encoded strings.
* `CIRCLE_ENTITY_SECRET`: your entity secret should be 64 lowercase alphanumeric
  characters.

```shell  theme={null}
echo "CIRCLE_API_KEY={YOUR_API_KEY}
CIRCLE_ENTITY_SECRET={YOUR_ENTITY_SECRET}" > .env
```

<Warning>
  Important: These are sensitive credentials. Do not commit them to version
  control or share them publicly.
</Warning>

## Step 2: Set up your wallets

In this step, you create dev-controlled wallets and fund them with USDC and
native tokens to make a deposit into a unified Gateway balance. If you already
have funded dev-controlled wallets, skip to
[Step 3](#step-3:-deposit-into-a-unified-crosschain-balance).

### 2.1. Create wallets on supported chains

Import the Circle Wallets SDK and initialize the client using your API key and
Entity Secret. Dev-controlled wallets are created in a
[wallet set](https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet#1-create-a-wallet-set),
which serves as the source from which individual wallet keys are derived.

<Note>
  If you supply a `refId`, all EVM wallets sharing that `refId` in the function
  call will [have the same
  address](https://developers.circle.com/wallets/unified-wallet-addressing-evm#batch-create-wallets-across-supported-chains).
  Having the same address across all the blockchains makes it more
  straightforward when depositing funds with the [`deposit`
  function](https://developers.circle.com/gateway/references/contract-interfaces-and-events#deposit).
</Note>

```ts  theme={null}
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: "<YOUR_API_KEY>",
  entitySecret: "<YOUR_ENTITY_SECRET>",
});

// Create a wallet set
const walletSetResponse = await client.createWalletSet({
  name: "Gateway Source Wallets",
});

// Create wallets on supported chains
const walletsResponse = await client.createWallets({
  blockchains: ["ARC-TESTNET", "AVAX-FUJI", "BASE-SEPOLIA", "ETH-SEPOLIA"],
  count: 1,
  walletSetId: walletSetResponse.data?.walletSet?.id ?? "",
  metadata: [{ refId: "source-depositor" }],
});
```

<Note>
  If you're calling the API directly, you'll need
  to make two requests: one to [create the wallet set](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/create-wallet-set); one to [create the wallet](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/create-wallet).

  Be sure to replace the
  [Entity Secret ciphertext](https://developers.circle.com/wallets/dev-controlled/entity-secret-management#what-is-an-entity-secret-ciphertext)￼
  and the idempotency key in your request. If you're using the SDKs, this is
  handled automatically for you.
</Note>

You should now have four new Externally Owned Account (EOA) developer-controlled
wallets with the same wallet address that you can also see from the
[Developer Console](https://console.circle.com/wallets/dev/wallets). The API
response will look similar to the following:

```shell  theme={null}
[
  {
    id: "d646ea32-818d-50e2-85d6-473f809c9f24",
    state: "LIVE",
    walletSetId: "116e0d3e-4f6d-5f2f-8f34-b119732fce0b",
    custodyType: "DEVELOPER",
    refId: "source-depositor",
    name: "",
    address: "0x7f6f2263e451756456a87e9d6911db22617becf5",
    blockchain: "ARC-TESTNET",
    accountType: "EOA",
    updateDate: "2026-01-07T10:07:50Z",
    createDate: "2026-01-07T10:07:50Z",
  }, {
    id: "4be20092-b475-551a-a24f-b698e73c078d",
    state: "LIVE",
    walletSetId: "116e0d3e-4f6d-5f2f-8f34-b119732fce0b",
    custodyType: "DEVELOPER",
    refId: "source-depositor",
    name: "",
    address: "0x7f6f2263e451756456a87e9d6911db22617becf5",
    blockchain: "AVAX-FUJI",
    accountType: "EOA",
    updateDate: "2026-01-07T10:07:50Z",
    createDate: "2026-01-07T10:07:50Z",
  }, {
    id: "ec2cd72c-e799-5fa7-95f1-08e1a62a1b1a",
    state: "LIVE",
    walletSetId: "116e0d3e-4f6d-5f2f-8f34-b119732fce0b",
    custodyType: "DEVELOPER",
    refId: "source-depositor",
    name: "",
    address: "0x7f6f2263e451756456a87e9d6911db22617becf5",
    blockchain: "BASE-SEPOLIA",
    accountType: "EOA",
    updateDate: "2026-01-07T10:07:50Z",
    createDate: "2026-01-07T10:07:50Z",
  }, {
    id: "1b93227b-7721-5f27-a825-ffbc46cf92fc",
    state: "LIVE",
    walletSetId: "116e0d3e-4f6d-5f2f-8f34-b119732fce0b",
    custodyType: "DEVELOPER",
    refId: "source-depositor",
    name: "",
    address: "0x7f6f2263e451756456a87e9d6911db22617becf5",
    blockchain: "ETH-SEPOLIA",
    accountType: "EOA",
    updateDate: "2026-01-07T10:07:50Z",
    createDate: "2026-01-07T10:07:50Z",
  }
]
```

Add the wallet address to the `.env` file. It will be used in the deposit,
balances and transfer scripts described in the following sections.

```shell  theme={null}
echo "DEPOSITOR_ADDRESS={YOUR_WALLET_ADDRESS}" >> .env
```

### 2.2. Add testnet funds to your wallet

To interact with Gateway, you need test USDC and native tokens in your wallet on
each chain you deposit from. You also need testnet native tokens on the
destination chain to call the Gateway Minter contract.

Use the [Circle Faucet](https://faucet.circle.com/) to get testnet USDC and the
[Console Faucet](https://console.circle.com/faucet) to get testnet native
tokens. In addition, the following faucets can also be used to fund your wallet
with testnet native tokens:

<Tabs>
  <Tab title="Arc">
    **Faucet:** [Arc Testnet](https://faucet.circle.com) (USDC + native tokens)

    | Property     | Value                                        |
    | ------------ | -------------------------------------------- |
    | Chain name   | `arcTestnet`                                 |
    | USDC address | `0x3600000000000000000000000000000000000000` |
    | Domain ID    | `26`                                         |
  </Tab>

  <Tab title="Avalanche">
    **Faucet:** [Avalanche Fuji](https://core.app/tools/testnet-faucet)

    | Property     | Value                                        |
    | ------------ | -------------------------------------------- |
    | Chain name   | `avalancheFuji`                              |
    | USDC address | `0x5425890298aed601595a70ab815c96711a31bc65` |
    | Domain ID    | `1`                                          |
  </Tab>

  <Tab title="Base">
    **Faucet:** [Base Sepolia](https://www.alchemy.com/faucets/base-sepolia)

    | Property     | Value                                        |
    | ------------ | -------------------------------------------- |
    | Chain name   | `baseSepolia`                                |
    | USDC address | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
    | Domain ID    | `6`                                          |
  </Tab>

  <Tab title="Ethereum">
    **Faucet:** [Ethereum Sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

    | Property     | Value                                        |
    | ------------ | -------------------------------------------- |
    | Chain name   | `sepolia`                                    |
    | USDC address | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
    | Domain ID    | `0`                                          |
  </Tab>
</Tabs>

To request more testnet USDC, you can fill out this
[Testnet USDC Faucet Survey](https://docs.google.com/forms/d/e/1FAIpQLSfxt9OFA4I2v6Jp7u_4R4mdfitOkXqGZYeXBe10foCS1nEJkg/viewform).

### 2.3. Check wallet balances

You can check your wallet balances from the
[Circle Developer Console](https://console.circle.com/wallets/dev/wallets) or
programmatically by making a request to
[GET /wallets/\{id}/balances](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/list-wallet-balance)
with the specified wallet ID.

<CodeGroup>
  ```ts Node.js theme={null}
  const response = await client.getWalletTokenBalance({
    id: "<WALLET_ID>",
  });
  ```

  ```shell cURL theme={null}
  curl --request GET \
       --url 'https://api.circle.com/v1/w3s/wallets/{<WALLET_ID>}/balances' \
       --header 'accept: application/json' \
       --header 'authorization: Bearer <YOUR_API_KEY>'
  ```
</CodeGroup>

## Step 3: Deposit into a unified crosschain balance

In this step, you review each part of the script to deposit USDC into the
Gateway Wallet contracts. You can skip to the
[full deposit script](#3-6-full-deposit-script) if you prefer.

### 3.1. Create the script file

```shell  theme={null}
touch deposit.ts
```

### 3.2. Define chain configuration

```ts deposit.ts theme={null}
type Chain = "ethereum" | "base" | "avalanche" | "arc";

type ChainConfig = {
  chainName: string;
  usdc: string;
  walletChain: string;
};

const chainConfig: Record<Chain, ChainConfig> = {
  ethereum: {
    chainName: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    walletChain: "ETH-SEPOLIA",
  },
  base: {
    chainName: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    walletChain: "BASE-SEPOLIA",
  },
  avalanche: {
    chainName: "Avalanche Fuji",
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    walletChain: "AVAX-FUJI",
  },
  arc: {
    chainName: "Arc Testnet",
    usdc: "0x3600000000000000000000000000000000000000",
    walletChain: "ARC-TESTNET",
  },
};
```

### 3.3. Define constants

```ts deposit.ts theme={null}
const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;

if (!API_KEY || !ENTITY_SECRET) {
  console.error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env");
  process.exit(1);
}

const DEPOSITOR_ADDRESS = process.env.DEPOSITOR_ADDRESS!;
const DEPOSIT_AMOUNT_USDC = "2";
```

### 3.4. Add helper functions

```ts deposit.ts expandable theme={null}
// Parse chains from CLI arguments
function parseSelectedChains() {
  const args = process.argv.slice(2).map((chain) => chain.toLowerCase());
  const validChains = Object.keys(chainConfig);

  if (args.length === 0) {
    throw new Error(
      "No chains specified. Usage: npm run deposit -- <chain1> [chain2...] or 'all'",
    );
  }

  if (args.length === 1 && args[0] === "all") {
    return Object.keys(chainConfig) as Chain[];
  }

  const invalid = args.filter((arg) => !(arg in chainConfig));
  if (invalid.length > 0) {
    console.error(
      `Unsupported chain: ${invalid.join(", ")}\n` +
        `Valid chains: ${validChains.join(", ")}, all\n` +
        `Example: npm run deposit -- arc base`,
    );
    process.exit(1);
  }

  return [...new Set(args)] as Chain[];
}

// Poll until transaction reaches terminal state
async function waitForTxCompletion(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
  txId: string,
  label: string,
) {
  const terminalStates = new Set([
    "COMPLETE",
    "CONFIRMED",
    "FAILED",
    "DENIED",
    "CANCELLED",
  ]);

  process.stdout.write(`Waiting for ${label} (txId=${txId})\n`);

  while (true) {
    const { data } = await client.getTransaction({ id: txId });
    const state = data?.transaction?.state;

    process.stdout.write(".");

    if (state && terminalStates.has(state)) {
      process.stdout.write("\n");
      console.log(`${label} final state: ${state}`);

      if (state !== "COMPLETE" && state !== "CONFIRMED") {
        throw new Error(
          `${label} did not complete successfully (state=${state})`,
        );
      }
      return data.transaction;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

// Parse decimal to base units: "10.5" → 10500000n
function parseBalance(usdcStr: string) {
  const [whole, decimal = ""] = String(usdcStr).split(".");
  const decimal6 = (decimal + "000000").slice(0, 6);
  return BigInt(whole + decimal6);
}
```

### 3.5. Approve and deposit USDC

The main logic performs two key actions:

* **Approve USDC transfers:** It calls the `approve` method on the USDC contract
  to allow the Gateway Wallet contract to transfer USDC from your wallet.
* **Deposit USDC into Gateway:** After receiving the approval transaction hash,
  it calls the `deposit` method on the Gateway Wallet contract.

<Note>
  **Important:** You must call the `deposit` method, not the standard `transfer`
  function on the USDC contract. Deposits into the Gateway Wallet only work
  through the designated `deposit` function.
</Note>

```ts deposit.ts expandable theme={null}
async function main() {
  // Allows for chain selection via CLI arguments
  const selectedChains = parseSelectedChains();
  console.log(
    `Depositing to: ${selectedChains.map((chain) => chainConfig[chain].chainName).join(", ")}`,
  );

  // Initiate wallets client
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY!,
    entitySecret: ENTITY_SECRET!,
  });

  // Process each selected chain
  for (const chain of selectedChains) {
    try {
      console.log(`\n=== Processing ${chainConfig[chain].chainName} ===`);

      // Approve Gateway Wallet to spend USDC
      console.log(
        `Approving ${DEPOSIT_AMOUNT_USDC} USDC on ${chainConfig[chain].chainName}...`,
      );

      const approveTx = await client.createContractExecutionTransaction({
        walletAddress: DEPOSITOR_ADDRESS,
        blockchain: chainConfig[chain].walletChain,
        contractAddress: chainConfig[chain].usdc,
        abiFunctionSignature: "approve(address,uint256)",
        abiParameters: [
          GATEWAY_WALLET_ADDRESS,
          parseBalance(DEPOSIT_AMOUNT_USDC).toString(),
        ],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const approveTxId = approveTx.data?.id;
      if (!approveTxId) throw new Error("Failed to create approve transaction");

      await waitForTxCompletion(client, approveTxId, "USDC approve");

      // Deposit USDC into Gateway Wallet
      console.log(`Depositing ${DEPOSIT_AMOUNT_USDC} USDC to Gateway Wallet`);

      const depositTx = await client.createContractExecutionTransaction({
        walletAddress: DEPOSITOR_ADDRESS,
        blockchain: chainConfig[chain].walletChain,
        contractAddress: GATEWAY_WALLET_ADDRESS,
        abiFunctionSignature: "deposit(address,uint256)",
        abiParameters: [
          chainConfig[chain].usdc,
          parseBalance(DEPOSIT_AMOUNT_USDC).toString(),
        ],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const depositTxId = depositTx.data?.id;
      if (!depositTxId) throw new Error("Failed to create deposit transaction");

      await waitForTxCompletion(client, depositTxId, "Gateway deposit");
    } catch (err) {
      console.error(`Error on ${chainConfig[chain].chainName}:`, err);
    }
  }

  console.log(
    "\n==| Block confirmation may take up to 19 minutes for some chains |==",
  );
}

main().catch((error) => {
  console.error("\nError:", error);
  process.exit(1);
});
```

### 3.6. Full deposit script

Now that you've completed the setup and core steps, this full script brings
everything together. It deposits 2 USDC from the specified chain into your
Gateway balance. The script includes inline comments to explain what each
function does, making it easier to follow and modify if needed.

```ts deposit.ts expandable theme={null}
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

/* Chain configuration */
type Chain = "ethereum" | "base" | "avalanche" | "arc";

type ChainConfig = {
  chainName: string;
  usdc: string;
  walletChain: string;
};

const chainConfig: Record<Chain, ChainConfig> = {
  ethereum: {
    chainName: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    walletChain: "ETH-SEPOLIA",
  },
  base: {
    chainName: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    walletChain: "BASE-SEPOLIA",
  },
  avalanche: {
    chainName: "Avalanche Fuji",
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    walletChain: "AVAX-FUJI",
  },
  arc: {
    chainName: "Arc Testnet",
    usdc: "0x3600000000000000000000000000000000000000",
    walletChain: "ARC-TESTNET",
  },
};

/* Constants */
const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;

if (!API_KEY || !ENTITY_SECRET) {
  console.error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env");
  process.exit(1);
}

const DEPOSITOR_ADDRESS = process.env.DEPOSITOR_ADDRESS!;
const DEPOSIT_AMOUNT_USDC = "2";

/* Helpers */
// Parse chains from CLI arguments
function parseSelectedChains() {
  const args = process.argv.slice(2).map((chain) => chain.toLowerCase());
  const validChains = Object.keys(chainConfig);

  if (args.length === 0) {
    throw new Error(
      "No chains specified. Usage: npm run deposit -- <chain1> [chain2...] or 'all'",
    );
  }

  if (args.length === 1 && args[0] === "all") {
    return Object.keys(chainConfig) as Chain[];
  }

  const invalid = args.filter((arg) => !(arg in chainConfig));
  if (invalid.length > 0) {
    console.error(
      `Unsupported chain: ${invalid.join(", ")}\n` +
        `Valid chains: ${validChains.join(", ")}, all\n` +
        `Example: npm run deposit -- ethereum base`,
    );
    process.exit(1);
  }

  return [...new Set(args)] as Chain[];
}

// Parse decimal to base units: "10.5" → 10500000n
function parseBalance(value: string | number | null | undefined): bigint {
  const str = String(value ?? "0");
  const [whole, decimal = ""] = str.split(".");
  const decimal6 = (decimal + "000000").slice(0, 6);
  return BigInt((whole || "0") + decimal6);
}

// Poll until transaction reaches terminal state
async function waitForTxCompletion(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
  txId: string,
  label: string,
) {
  const terminalStates = new Set([
    "COMPLETE",
    "CONFIRMED",
    "FAILED",
    "DENIED",
    "CANCELLED",
  ]);

  process.stdout.write(`Waiting for ${label} (txId=${txId})\n`);

  while (true) {
    const { data } = await client.getTransaction({ id: txId });
    const state = data?.transaction?.state;

    process.stdout.write(".");

    if (state && terminalStates.has(state)) {
      process.stdout.write("\n");
      console.log(`${label} final state: ${state}`);

      if (state !== "COMPLETE" && state !== "CONFIRMED") {
        throw new Error(
          `${label} did not complete successfully (state=${state})`,
        );
      }
      return data.transaction;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

/* Main logic */
async function main() {
  // Allows for chain selection via CLI arguments
  const selectedChains = parseSelectedChains();
  console.log(
    `Depositing to: ${selectedChains.map((chain) => chainConfig[chain].chainName).join(", ")}`,
  );

  // Initiate wallets client
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY!,
    entitySecret: ENTITY_SECRET!,
  });

  // Process each selected chain
  for (const chain of selectedChains) {
    try {
      console.log(`\n=== Processing ${chainConfig[chain].chainName} ===`);

      // Approve Gateway Wallet to spend USDC
      console.log(
        `Approving ${DEPOSIT_AMOUNT_USDC} USDC on ${chainConfig[chain].chainName}...`,
      );

      const approveTx = await client.createContractExecutionTransaction({
        walletAddress: DEPOSITOR_ADDRESS,
        blockchain: chainConfig[chain].walletChain,
        contractAddress: chainConfig[chain].usdc,
        abiFunctionSignature: "approve(address,uint256)",
        abiParameters: [
          GATEWAY_WALLET_ADDRESS,
          parseBalance(DEPOSIT_AMOUNT_USDC).toString(),
        ],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const approveTxId = approveTx.data?.id;
      if (!approveTxId) throw new Error("Failed to create approve transaction");

      await waitForTxCompletion(client, approveTxId, "USDC approve");

      // Deposit USDC into Gateway Wallet
      console.log(`Depositing ${DEPOSIT_AMOUNT_USDC} USDC to Gateway Wallet`);

      const depositTx = await client.createContractExecutionTransaction({
        walletAddress: DEPOSITOR_ADDRESS,
        blockchain: chainConfig[chain].walletChain,
        contractAddress: GATEWAY_WALLET_ADDRESS,
        abiFunctionSignature: "deposit(address,uint256)",
        abiParameters: [
          chainConfig[chain].usdc,
          parseBalance(DEPOSIT_AMOUNT_USDC).toString(),
        ],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      });

      const depositTxId = depositTx.data?.id;
      if (!depositTxId) throw new Error("Failed to create deposit transaction");

      await waitForTxCompletion(client, depositTxId, "Gateway deposit");
    } catch (err) {
      console.error(`Error on ${chainConfig[chain].chainName}:`, err);
    }
  }

  console.log(
    "\n==| Block confirmation may take up to 19 minutes for some chains |==",
  );
}

main().catch((error) => {
  console.error("\nError:", error);
  process.exit(1);
});
```

### 3.7. Run the script to create a crosschain balance

Run the `deposit` script to make the deposits. You must specify at least one
chain using command-line arguments.

```shell  theme={null}
# Deposit to all chains
npm run deposit -- all

# Deposit to a single chain
npm run deposit -- base

# Deposit to multiple chains
npm run deposit -- base avalanche
```

Wait for the
[required number of block confirmations](https://developers.circle.com/gateway/references/supported-blockchains#required-block-confirmations).
Once the deposit transactions are final, the total balance is the sum of all the
USDC from deposit transactions across all supported chains that have reached
finality. Note that for certain chains, finality may take up to 20 minutes to be
reached.

### 3.8. Check the balances on the Gateway Wallet

Create a new file called `balances.ts`, and add the following code. This script
retrieves the USDC balances available from your Gateway Wallet on each supported
chain. You can run it to check whether finality has been reached for recent
transactions.

```shell  theme={null}
touch balances.ts
```

The code makes a call to the
[`/balances`](https://developers.circle.com/api-reference/gateway/all/get-token-balances)
endpoint for the balances on all the domains, then formats the response to
display the USDC balance for each chain and calculate the total.

```ts balances.ts expandable theme={null}
interface GatewayBalancesResponse {
  balances: Array<{
    domain: number;
    balance: string;
  }>;
}

const DOMAINS = {
  ethereum: 0,
  avalanche: 1,
  base: 6,
  arc: 26,
};

const DEPOSITOR_ADDRESS = process.env.DEPOSITOR_ADDRESS!;

async function main() {
  console.log(`Depositor address: ${DEPOSITOR_ADDRESS}\n`);

  const domainIds = Object.values(DOMAINS);
  const body = {
    token: "USDC",
    sources: domainIds.map((domain) => ({
      domain,
      depositor: DEPOSITOR_ADDRESS,
    })),
  };

  const res = await fetch(
    "https://gateway-api-testnet.circle.com/v1/balances",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const result = (await res.json()) as GatewayBalancesResponse;

  let total = 0;
  for (const balance of result.balances) {
    const chain =
      Object.keys(DOMAINS).find(
        (k) => DOMAINS[k as keyof typeof DOMAINS] === balance.domain,
      ) || `Domain ${balance.domain}`;
    const amount = parseFloat(balance.balance);
    console.log(`${chain}: ${amount.toFixed(6)} USDC`);
    total += amount;
  }

  console.log(`\nTotal: ${total.toFixed(6)} USDC`);
}

main().catch((error) => {
  console.error("\nError:", error);
  process.exit(1);
});
```

Run the script to check the unified balance.

```shell  theme={null}
npm run balances
```

## Step 4: Transfer USDC from the crosschain balance to Arc

In this step, you can review the transfer script, covering configuration,
approval, and minting USDC on Arc from your crosschain balance. You can skip to
the [full transfer script](#4-8-full-transfer-script) if you prefer.

### 4.1. Create the script file

```shell  theme={null}
touch transfer.ts
```

### 4.2. Define chain configuration

```ts transfer.ts theme={null}
type WalletChain = "ETH-SEPOLIA" | "BASE-SEPOLIA" | "AVAX-FUJI" | "ARC-TESTNET";

type Chain = "ethereum" | "base" | "avalanche" | "arc";

type ChainConfig = {
  chainName: string;
  usdc: string;
  domain: number;
  walletChain: WalletChain;
};

const chainConfig: Record<Chain, ChainConfig> = {
  ethereum: {
    chainName: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    domain: 0,
    walletChain: "ETH-SEPOLIA",
  },
  base: {
    chainName: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    domain: 6,
    walletChain: "BASE-SEPOLIA",
  },
  avalanche: {
    chainName: "Avalanche Fuji",
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    domain: 1,
    walletChain: "AVAX-FUJI",
  },
  arc: {
    chainName: "Arc Testnet",
    usdc: "0x3600000000000000000000000000000000000000",
    domain: 26,
    walletChain: "ARC-TESTNET",
  },
};
```

### 4.3. Define constants and EIP-712 typed data types

These constants define the parameters for transferring funds from your Gateway
balance to a wallet on the destination chain.

* The `DESTINATION_CHAIN` is currently set to `BASE-SEPOLIA` but you can change
  it to a chain of your choice. Note that
  [gas fees](https://developers.circle.com/gateway/references/fees#table-of-fees)
  differ between chains.
* Replace `<RECIPIENT_ADDRESS>` with the wallet address that will receive USDC
  on the destination chain. This can be any valid Ethereum address (e.g., your
  own wallet, another user's address, or the same `DEPOSITOR_ADDRESS` to send to
  yourself).
* You can set the amount of USDC to be transferred from each chain within the
  unified balance, which is currently set to 1 USDC.

```ts transfer.ts expandable theme={null}
const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
const GATEWAY_MINTER_ADDRESS = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B";
const MAX_UINT256_DEC = ((1n << 256n) - 1n).toString();

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;

if (!API_KEY || !ENTITY_SECRET) {
  console.error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env");
  process.exit(1);
}

const DEPOSITOR_ADDRESS = process.env.DEPOSITOR_ADDRESS!;
const DESTINATION_CHAIN: WalletChain = "BASE-SEPOLIA";
const RECIPIENT_ADDRESS = "<RECIPIENT_ADDRESS>";
const TRANSFER_AMOUNT_USDC = 1; // 1 USDC
const MAX_FEE = 2_010000n;

/* Burn intent and EIP-712 definitions */
const domain = { name: "GatewayWallet", version: "1" };

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
];

const TransferSpec = [
  { name: "version", type: "uint32" },
  { name: "sourceDomain", type: "uint32" },
  { name: "destinationDomain", type: "uint32" },
  { name: "sourceContract", type: "bytes32" },
  { name: "destinationContract", type: "bytes32" },
  { name: "sourceToken", type: "bytes32" },
  { name: "destinationToken", type: "bytes32" },
  { name: "sourceDepositor", type: "bytes32" },
  { name: "destinationRecipient", type: "bytes32" },
  { name: "sourceSigner", type: "bytes32" },
  { name: "destinationCaller", type: "bytes32" },
  { name: "value", type: "uint256" },
  { name: "salt", type: "bytes32" },
  { name: "hookData", type: "bytes" },
];

const BurnIntent = [
  { name: "maxBlockHeight", type: "uint256" },
  { name: "maxFee", type: "uint256" },
  { name: "spec", type: "TransferSpec" },
];
```

### 4.4. Add helper functions

```ts transfer.ts expandable theme={null}
// Construct burn intent for a given source chain
function createBurnIntent(params: {
  sourceChain: Chain;
  depositorAddress: string;
  recipientAddress?: string;
}) {
  const {
    sourceChain,
    depositorAddress,
    recipientAddress = depositorAddress,
  } = params;
  const source = chainConfig[sourceChain];
  const destination = getConfigByWalletChain(DESTINATION_CHAIN);
  const value = parseBalance(String(TRANSFER_AMOUNT_USDC));

  return {
    maxBlockHeight: MAX_UINT256_DEC,
    maxFee: MAX_FEE,
    spec: {
      version: 1,
      sourceDomain: source.domain,
      destinationDomain: destination.domain,
      sourceContract: GATEWAY_WALLET_ADDRESS,
      destinationContract: GATEWAY_MINTER_ADDRESS,
      sourceToken: source.usdc,
      destinationToken: destination.usdc,
      sourceDepositor: depositorAddress,
      destinationRecipient: recipientAddress,
      sourceSigner: depositorAddress,
      destinationCaller: "0x0000000000000000000000000000000000000000",
      value: value,
      salt: "0x" + randomBytes(32).toString("hex"),
      hookData: "0x",
    },
  };
}

// Format burn intent as EIP-712 typed data for signing
function burnIntentTypedData(burnIntent: ReturnType<typeof createBurnIntent>) {
  return {
    types: { EIP712Domain, TransferSpec, BurnIntent },
    domain,
    primaryType: "BurnIntent",
    message: {
      ...burnIntent,
      spec: {
        ...burnIntent.spec,
        sourceContract: addressToBytes32(burnIntent.spec.sourceContract),
        destinationContract: addressToBytes32(
          burnIntent.spec.destinationContract,
        ),
        sourceToken: addressToBytes32(burnIntent.spec.sourceToken),
        destinationToken: addressToBytes32(burnIntent.spec.destinationToken),
        sourceDepositor: addressToBytes32(burnIntent.spec.sourceDepositor),
        destinationRecipient: addressToBytes32(
          burnIntent.spec.destinationRecipient,
        ),
        sourceSigner: addressToBytes32(burnIntent.spec.sourceSigner),
        destinationCaller: addressToBytes32(
          burnIntent.spec.destinationCaller ??
            "0x0000000000000000000000000000000000000000",
        ),
      },
    },
  };
}

// Look up chain configuration by wallet chain
function getConfigByWalletChain(walletChain: WalletChain) {
  const entry = Object.values(chainConfig).find(
    (item) => item.walletChain === walletChain,
  );
  if (!entry) {
    throw new Error(`No config found for destination chain ${walletChain}`);
  }
  return entry;
}

// Parse chains from CLI arguments
function parseSelectedChains() {
  const args = process.argv.slice(2).map((chain) => chain.toLowerCase());
  const validChains = Object.keys(chainConfig);

  if (args.length === 0) {
    throw new Error(
      "No chains specified. Usage: npm run transfer -- <chain1> [chain2...] or 'all'",
    );
  }

  if (args.length === 1 && args[0] === "all") {
    return Object.keys(chainConfig) as Chain[];
  }

  const invalid = args.filter((arg) => !(arg in chainConfig));
  if (invalid.length > 0) {
    console.error(
      `Unsupported chain: ${invalid.join(", ")}\n` +
        `Valid chains: ${validChains.join(", ")}, all\n` +
        `Example: npm run transfer -- ethereum base`,
    );
    process.exit(1);
  }

  return [...new Set(args)] as Chain[];
}

// Pad address to 32 bytes
function addressToBytes32(address: string) {
  return ("0x" +
    address
      .toLowerCase()
      .replace(/^0x/, "")
      .padStart(64, "0")) as `0x${string}`;
}

// Parse decimal to base units: "10.5" → 10500000n
function parseBalance(value: string | number | null | undefined): bigint {
  const str = String(value ?? "0");
  const [whole, decimal = ""] = str.split(".");
  const decimal6 = (decimal + "000000").slice(0, 6);
  return BigInt((whole || "0") + decimal6);
}

// Format base units to decimal: 10500000n → "10.5"
function formatUnits(value: bigint, decimals: number) {
  let display = value.toString();

  const negative = display.startsWith("-");
  if (negative) display = display.slice(1);

  display = display.padStart(decimals, "0");

  const integer = display.slice(0, display.length - decimals);
  let fraction = display.slice(display.length - decimals);

  fraction = fraction.replace(/(0+)$/, "");
  return `${negative ? "-" : ""}${integer || "0"}${fraction ? `.${fraction}` : ""}`;
}

// Serialize typed data (convert bigints to strings)
function stringifyTypedData<T>(obj: T) {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

// Poll until transaction reaches terminal state
async function waitForTxCompletion(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
  txId: string,
  label: string,
) {
  const terminalStates = new Set([
    "COMPLETE",
    "CONFIRMED",
    "FAILED",
    "DENIED",
    "CANCELLED",
  ]);

  process.stdout.write(`Waiting for ${label} (txId=${txId})\n`);

  while (true) {
    const { data } = await client.getTransaction({ id: txId });
    const state = data?.transaction?.state;

    process.stdout.write(".");

    if (state && terminalStates.has(state)) {
      process.stdout.write("\n");
      console.log(`${label} final state: ${state}`);

      if (state !== "COMPLETE" && state !== "CONFIRMED") {
        throw new Error(
          `${label} did not complete successfully (state=${state})`,
        );
      }
      return data.transaction;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}
```

### 4.5. Construct and sign the burn intents

First, within the main logic, you need to build the requests and sign them
before they can be submitted to the Gateway API.

```ts  theme={null}
const requests = [];

for (const chain of selectedChains) {
  console.log(`Creating burn intent from ${chain} → ${DESTINATION_CHAIN}...`);

  const burnIntent = createBurnIntent({
    sourceChain: chain,
    depositorAddress: DEPOSITOR_ADDRESS,
    recipientAddress: RECIPIENT_ADDRESS,
  });

  const typedData = burnIntentTypedData(burnIntent);

  const sigResp = await client.signTypedData({
    walletAddress: DEPOSITOR_ADDRESS,
    blockchain: chainConfig[chain].walletChain,
    data: stringifyTypedData(typedData),
  });

  requests.push({
    burnIntent: typedData.message,
    signature: sigResp.data?.signature,
  });
}
console.log("Signed burn intents.");
```

### 4.6. Submit the burn intents to the API

Then, you use the signed burn intents to request an attestation from the Gateway
API.

```ts  theme={null}
const response = await fetch(
  "https://gateway-api-testnet.circle.com/v1/transfer",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: stringifyTypedData(requests),
  },
);

const json = (await response.json()) as {
  attestation: string;
  signature: string;
};

const attestation = json?.attestation;
const operatorSig = json?.signature;
```

### 4.7. Mint USDC on destination chain

Finally, you need to use the attestation to mint USDC to the destination chain
by calling `gatewayMint()` on the Gateway Minter contract.

```ts  theme={null}
const tx = await client.createContractExecutionTransaction({
  walletAddress: DEPOSITOR_ADDRESS,
  blockchain: DESTINATION_CHAIN,
  contractAddress: GATEWAY_MINTER_ADDRESS,
  abiFunctionSignature: "gatewayMint(bytes,bytes)",
  abiParameters: [attestation, operatorSig],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
});

console.log("Mint tx submitted:", tx.data?.id);
```

### 4.8. Full transfer script

Now that you've covered the setup and core steps, this full script puts
everything together and transfers out 1 USDC from each specified Gateway
balances to the destination address. It includes comments that describe what
each function does as well for reference. Remember to replace the placeholder
`<RECIPIENT_ADDRESS>` with your own recipient address.

```ts transfer.ts expandable theme={null}
import { randomBytes } from "node:crypto";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

/* Chain configuration */
type WalletChain = "ETH-SEPOLIA" | "BASE-SEPOLIA" | "AVAX-FUJI" | "ARC-TESTNET";

type Chain = "ethereum" | "base" | "avalanche" | "arc";

type ChainConfig = {
  chainName: string;
  usdc: string;
  domain: number;
  walletChain: WalletChain;
};

const chainConfig: Record<Chain, ChainConfig> = {
  ethereum: {
    chainName: "Ethereum Sepolia",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    domain: 0,
    walletChain: "ETH-SEPOLIA",
  },
  base: {
    chainName: "Base Sepolia",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    domain: 6,
    walletChain: "BASE-SEPOLIA",
  },
  avalanche: {
    chainName: "Avalanche Fuji",
    usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
    domain: 1,
    walletChain: "AVAX-FUJI",
  },
  arc: {
    chainName: "Arc Testnet",
    usdc: "0x3600000000000000000000000000000000000000",
    domain: 26,
    walletChain: "ARC-TESTNET",
  },
};

/* Constants */
const GATEWAY_WALLET_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
const GATEWAY_MINTER_ADDRESS = "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B";
const MAX_UINT256_DEC = ((1n << 256n) - 1n).toString();

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;

if (!API_KEY || !ENTITY_SECRET) {
  console.error("Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env");
  process.exit(1);
}

const DEPOSITOR_ADDRESS = process.env.DEPOSITOR_ADDRESS!;
const DESTINATION_CHAIN: WalletChain = "BASE-SEPOLIA";
const RECIPIENT_ADDRESS = "<RECIPIENT_ADDRESS>";
const TRANSFER_AMOUNT_USDC = 1; // 1 USDC
const MAX_FEE = 2_010000n;

/* Burn intent and EIP-712 definitions */
const domain = { name: "GatewayWallet", version: "1" };

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
];

const TransferSpec = [
  { name: "version", type: "uint32" },
  { name: "sourceDomain", type: "uint32" },
  { name: "destinationDomain", type: "uint32" },
  { name: "sourceContract", type: "bytes32" },
  { name: "destinationContract", type: "bytes32" },
  { name: "sourceToken", type: "bytes32" },
  { name: "destinationToken", type: "bytes32" },
  { name: "sourceDepositor", type: "bytes32" },
  { name: "destinationRecipient", type: "bytes32" },
  { name: "sourceSigner", type: "bytes32" },
  { name: "destinationCaller", type: "bytes32" },
  { name: "value", type: "uint256" },
  { name: "salt", type: "bytes32" },
  { name: "hookData", type: "bytes" },
];

const BurnIntent = [
  { name: "maxBlockHeight", type: "uint256" },
  { name: "maxFee", type: "uint256" },
  { name: "spec", type: "TransferSpec" },
];

/* Helpers */
// Construct burn intent for a given source chain
function createBurnIntent(params: {
  sourceChain: Chain;
  depositorAddress: string;
  recipientAddress?: string;
}) {
  const {
    sourceChain,
    depositorAddress,
    recipientAddress = depositorAddress,
  } = params;
  const source = chainConfig[sourceChain];
  const destination = getConfigByWalletChain(DESTINATION_CHAIN);
  const value = parseBalance(String(TRANSFER_AMOUNT_USDC));

  return {
    maxBlockHeight: MAX_UINT256_DEC,
    maxFee: MAX_FEE,
    spec: {
      version: 1,
      sourceDomain: source.domain,
      destinationDomain: destination.domain,
      sourceContract: GATEWAY_WALLET_ADDRESS,
      destinationContract: GATEWAY_MINTER_ADDRESS,
      sourceToken: source.usdc,
      destinationToken: destination.usdc,
      sourceDepositor: depositorAddress,
      destinationRecipient: recipientAddress,
      sourceSigner: depositorAddress,
      destinationCaller: "0x0000000000000000000000000000000000000000",
      value: value,
      salt: "0x" + randomBytes(32).toString("hex"),
      hookData: "0x",
    },
  };
}

// Format burn intent as EIP-712 typed data for signing
function burnIntentTypedData(burnIntent: ReturnType<typeof createBurnIntent>) {
  return {
    types: { EIP712Domain, TransferSpec, BurnIntent },
    domain,
    primaryType: "BurnIntent",
    message: {
      ...burnIntent,
      spec: {
        ...burnIntent.spec,
        sourceContract: addressToBytes32(burnIntent.spec.sourceContract),
        destinationContract: addressToBytes32(
          burnIntent.spec.destinationContract,
        ),
        sourceToken: addressToBytes32(burnIntent.spec.sourceToken),
        destinationToken: addressToBytes32(burnIntent.spec.destinationToken),
        sourceDepositor: addressToBytes32(burnIntent.spec.sourceDepositor),
        destinationRecipient: addressToBytes32(
          burnIntent.spec.destinationRecipient,
        ),
        sourceSigner: addressToBytes32(burnIntent.spec.sourceSigner),
        destinationCaller: addressToBytes32(
          burnIntent.spec.destinationCaller ??
            "0x0000000000000000000000000000000000000000",
        ),
      },
    },
  };
}

// Look up chain configuration by wallet chain
function getConfigByWalletChain(walletChain: WalletChain) {
  const entry = Object.values(chainConfig).find(
    (item) => item.walletChain === walletChain,
  );
  if (!entry) {
    throw new Error(`No config found for destination chain ${walletChain}`);
  }
  return entry;
}

// Parse chains from CLI arguments
function parseSelectedChains() {
  const args = process.argv.slice(2).map((chain) => chain.toLowerCase());
  const validChains = Object.keys(chainConfig);

  if (args.length === 0) {
    throw new Error(
      "No chains specified. Usage: npm run transfer -- <chain1> [chain2...] or 'all'",
    );
  }

  if (args.length === 1 && args[0] === "all") {
    return Object.keys(chainConfig) as Chain[];
  }

  const invalid = args.filter((arg) => !(arg in chainConfig));
  if (invalid.length > 0) {
    console.error(
      `Unsupported chain: ${invalid.join(", ")}\n` +
        `Valid chains: ${validChains.join(", ")}, all\n` +
        `Example: npm run transfer -- ethereum base`,
    );
    process.exit(1);
  }

  return [...new Set(args)] as Chain[];
}

// Pad address to 32 bytes
function addressToBytes32(address: string) {
  return ("0x" +
    address
      .toLowerCase()
      .replace(/^0x/, "")
      .padStart(64, "0")) as `0x${string}`;
}

// Parse decimal to base units: "10.5" → 10500000n
function parseBalance(value: string | number | null | undefined): bigint {
  const str = String(value ?? "0");
  const [whole, decimal = ""] = str.split(".");
  const decimal6 = (decimal + "000000").slice(0, 6);
  return BigInt((whole || "0") + decimal6);
}

// Format base units to decimal: 10500000n → "10.5"
function formatUnits(value: bigint, decimals: number) {
  let display = value.toString();

  const negative = display.startsWith("-");
  if (negative) display = display.slice(1);

  display = display.padStart(decimals, "0");

  const integer = display.slice(0, display.length - decimals);
  let fraction = display.slice(display.length - decimals);

  fraction = fraction.replace(/(0+)$/, "");
  return `${negative ? "-" : ""}${integer || "0"}${fraction ? `.${fraction}` : ""}`;
}

// Serialize typed data (convert bigints to strings)
function stringifyTypedData<T>(obj: T) {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

// Poll until transaction reaches terminal state
async function waitForTxCompletion(
  client: ReturnType<typeof initiateDeveloperControlledWalletsClient>,
  txId: string,
  label: string,
) {
  const terminalStates = new Set([
    "COMPLETE",
    "CONFIRMED",
    "FAILED",
    "DENIED",
    "CANCELLED",
  ]);

  process.stdout.write(`Waiting for ${label} (txId=${txId})\n`);

  while (true) {
    const { data } = await client.getTransaction({ id: txId });
    const state = data?.transaction?.state;

    process.stdout.write(".");

    if (state && terminalStates.has(state)) {
      process.stdout.write("\n");
      console.log(`${label} final state: ${state}`);

      if (state !== "COMPLETE" && state !== "CONFIRMED") {
        throw new Error(
          `${label} did not complete successfully (state=${state})`,
        );
      }
      return data.transaction;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

/* Main logic */
async function main() {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY!,
    entitySecret: ENTITY_SECRET!,
  });

  // Allows for chain selection via CLI arguments
  const selectedChains = parseSelectedChains();
  console.log(
    `Transfering balances from: ${selectedChains.map((chain) => chainConfig[chain].chainName).join(", ")}`,
  );

  // [1] Construct and sign the burn intents
  const requests = [];

  for (const chain of selectedChains) {
    console.log(`Creating burn intent from ${chain} → ${DESTINATION_CHAIN}...`);

    const burnIntent = createBurnIntent({
      sourceChain: chain,
      depositorAddress: DEPOSITOR_ADDRESS,
      recipientAddress: RECIPIENT_ADDRESS,
    });

    const typedData = burnIntentTypedData(burnIntent);

    const sigResp = await client.signTypedData({
      walletAddress: DEPOSITOR_ADDRESS,
      blockchain: chainConfig[chain].walletChain,
      data: stringifyTypedData(typedData),
    });

    requests.push({
      burnIntent: typedData.message,
      signature: sigResp.data?.signature,
    });
  }
  console.log("Signed burn intents.");

  // [2] Submit burn intents to Gateway API to obtain an attestation
  const response = await fetch(
    "https://gateway-api-testnet.circle.com/v1/transfer",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: stringifyTypedData(requests),
    },
  );

  if (!response.ok) {
    console.error("Gateway API error status:", response.status);
    console.error(await response.text());
    throw new Error("Gateway API request failed");
  }

  const json = (await response.json()) as {
    attestation: string;
    signature: string;
  };
  console.log("Gateway API response:", JSON.stringify(json, null, 2));

  const attestation = json?.attestation;
  const operatorSig = json?.signature;

  if (!attestation || !operatorSig) {
    console.error("Gateway /transfer error: missing attestation or signature");
    throw new Error("Invalid Gateway API response");
  }

  // [3] Mint on the destination chain
  console.log(
    `Minting funds on ${getConfigByWalletChain(DESTINATION_CHAIN).chainName}...`,
  );

  const tx = await client.createContractExecutionTransaction({
    walletAddress: DEPOSITOR_ADDRESS,
    blockchain: DESTINATION_CHAIN,
    contractAddress: GATEWAY_MINTER_ADDRESS,
    abiFunctionSignature: "gatewayMint(bytes,bytes)",
    abiParameters: [attestation, operatorSig],
    fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  });

  console.log("Mint tx submitted:", tx.data?.id);

  const txId = tx.data?.id;
  if (!txId) throw new Error("Failed to submit mint transaction");
  await waitForTxCompletion(client, txId, "USDC mint");

  const totalMinted =
    BigInt(requests.length) * parseBalance(String(TRANSFER_AMOUNT_USDC));
  console.log(`Minted ${formatUnits(totalMinted, 6)} USDC`);
  console.log(`Mint transaction ID (${DESTINATION_CHAIN}):`, txId);
}

main().catch((error) => {
  console.error("\nError:", error);
  process.exit(1);
});
```

### 4.9. Run the script to transfer USDC to destination chain

Run the `transfer` script to transfer 1 USDC from each selected Gateway balance
to the destination chain.

<Note>
  [Gateway gas fees](https://developers.circle.com/gateway/references/fees) are
  charged per burn intent. To reduce overall gas costs, consider keeping most
  Gateway funds on low-cost chains, where Circle's base fee for burns is
  cheaper.
</Note>

```shell  theme={null}
# Transfer from all chains
npm run transfer -- all

# Transfer from a single chain
npm run transfer -- base

# Transfer from multiple chains
npm run transfer -- ethereum avalanche
```

## Summary

After completing this tutorial, you've successfully:

* Created dev-controlled wallets
* Funded your wallet with testnet USDC
* Created a unified USDC balance
* Transferred USDC out from your unified USDC balance