# Interact with contracts

> Execute contract functions on Arc Testnet to mint tokens, transfer assets, and perform contract operations.

This tutorial guides you through interacting with smart contracts deployed on
Arc Testnet. You'll learn how to execute contract functions like minting tokens,
transferring assets, and performing contract-specific operations for ERC-20,
ERC-721, ERC-1155, and Airdrop contracts.

## Prerequisites

Complete the [Deploy contracts](/arc/tutorials/deploy-contracts) tutorial first.
You'll need a deployed contract.

## Step 1: Set up tutorial scripts

### Update your environment variables

```shell
echo "RECIPIENT_WALLET_ADDRESS={RECIPIENT_ADDRESS_FOR_TRANSFERS}" >> .env
```

### Add npm scripts

```shell
npm pkg set scripts.interact-erc20="tsx --env-file=.env interact-erc20.ts"
npm pkg set scripts.interact-erc721="tsx --env-file=.env interact-erc721.ts"
npm pkg set scripts.interact-erc1155="tsx --env-file=.env interact-erc1155.ts"
npm pkg set scripts.interact-airdrop="tsx --env-file=.env interact-airdrop.ts"
```

## Step 2: Interact with contracts

### ERC-20

#### Mint tokens

```ts
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET,
});

const mintResponse =
  await circleDeveloperSdk.createContractExecutionTransaction({
    walletId: process.env.WALLET_ID,
    abiFunctionSignature: "mintTo(address,uint256)",
    abiParameters: [
      process.env.WALLET_ADDRESS,
      "1000000000000000000", // 1 token with 18 decimals
    ],
    contractAddress: process.env.CONTRACT_ADDRESS,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });

console.log(JSON.stringify(mintResponse.data, null, 2));
```

> **Token decimals**: ERC-20 tokens typically use 18 decimals. To mint 1 token,
> use `1000000000000000000` (1 x 10^18).

#### Transfer tokens

```ts
const transferResponse =
  await circleDeveloperSdk.createContractExecutionTransaction({
    walletId: process.env.WALLET_ID,
    abiFunctionSignature: "transfer(address,uint256)",
    abiParameters: [
      process.env.RECIPIENT_WALLET_ADDRESS,
      "1000000000000000000",
    ],
    contractAddress: process.env.CONTRACT_ADDRESS,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });
```

### ERC-721

#### Mint tokens

```ts
const mintResponse =
  await circleDeveloperSdk.createContractExecutionTransaction({
    walletId: process.env.WALLET_ID,
    abiFunctionSignature: "mintTo(address,string)",
    abiParameters: [
      process.env.WALLET_ADDRESS,
      "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei",
    ],
    contractAddress: process.env.CONTRACT_ADDRESS,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });
```

#### Transfer tokens

```ts
const transferResponse =
  await circleDeveloperSdk.createContractExecutionTransaction({
    walletId: process.env.WALLET_ID,
    abiFunctionSignature: "safeTransferFrom(address,address,uint256)",
    abiParameters: [
      "<FROM_ADDRESS>",
      "<TO_ADDRESS>",
      "1", // Token ID
    ],
    contractAddress: process.env.CONTRACT_ADDRESS,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });
```

### ERC-1155

#### Mint tokens

```ts
const mintResponse =
  await circleDeveloperSdk.createContractExecutionTransaction({
    walletId: process.env.WALLET_ID,
    abiFunctionSignature: "mintTo(address,uint256,string,uint256)",
    abiParameters: [
      process.env.WALLET_ADDRESS,
      "115792089237316195423570985008687907853269984665640564039457584007913129639935", // Max uint256 = ID 0
      "ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei",
      "1", // Amount
    ],
    contractAddress: process.env.CONTRACT_ADDRESS,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });
```

> **ERC-1155 Token ID Creation**: First mint requires max uint256 value to create
> token ID 0. For subsequent mints, use `0` which creates the next sequential ID.

#### Batch transfer tokens

```ts
const transferResponse =
  await circleDeveloperSdk.createContractExecutionTransaction({
    walletId: process.env.WALLET_ID,
    abiFunctionSignature:
      "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
    abiParameters: [
      "<FROM_ADDRESS>",
      "<TO_ADDRESS>",
      ["0"], // Token IDs
      ["1"], // Amounts
      "0x", // Empty bytes
    ],
    contractAddress: process.env.CONTRACT_ADDRESS,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });
```

### Airdrop

#### ERC-20 Airdrop

```ts
const airdropResponse =
  await circleDeveloperSdk.createContractExecutionTransaction({
    walletId: process.env.WALLET_ID,
    abiFunctionSignature: "airdropERC20(address,(address,uint256)[])",
    abiParameters: [
      "<TOKEN_CONTRACT_ADDRESS>",
      [
        ["<RECIPIENT_ADDRESS_1>", "1000000000000000000"],
        ["<RECIPIENT_ADDRESS_2>", "2000000000000000000"],
      ],
    ],
    contractAddress: process.env.CONTRACT_ADDRESS,
    fee: {
      type: "level",
      config: {
        feeLevel: "MEDIUM",
      },
    },
  });
```

#### ERC-721 Airdrop

Function signature: `airdropERC721(address,(address,uint256)[])`

#### ERC-1155 Airdrop

Function signature: `airdropERC1155(address,(address,uint256,uint256)[])`

---

## Summary

After completing this tutorial, you've learned how to:

* Execute contract functions using the Circle SDKs
* Mint and transfer tokens for your deployed contracts
* Perform contract-specific operations based on token type
