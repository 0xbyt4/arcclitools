# Deploy contracts

> Deploy pre-audited smart contract templates on Arc with Circle Contracts.

This tutorial guides you through deploying smart contracts on Arc Testnet with
[Circle Contracts](https://developers.circle.com/contracts/scp-templates-overview).
You'll create a
[Circle Dev-Controlled SCA Wallet](https://developers.circle.com/wallets/dev-controlled),
then deploy pre-audited contract templates (ERC-20, ERC-721, ERC-1155, Airdrop).
With SCA wallets,
[Circle Gas Station](https://developers.circle.com/wallets/gas-station) automatically
sponsors your transaction fees on Arc Testnet.

These pre-audited templates represent building blocks: ERC-20 for money and
liquidity, ERC-721 for identity and unique rights, ERC-1155 for scalable
financial instruments, and Airdrops for distributing incentives. To learn more
about available templates, visit the
[Templates Overview](https://developers.circle.com/contracts/scp-templates-overview)
to review all templates and their options.

## Prerequisites

To complete this tutorial, you need:

1. [Node.js v22+](https://nodejs.org/) installed
2. **Circle Developer Account** - [Sign up](https://console.circle.com/) on the
   Developer Console
3. **API Key** - Create in the Console: **Keys → Create a key → API key →
   Standard Key**
4. **Entity Secret** - Required to initialize the Circle Dev-Controlled Wallets
   SDK. Learn how to
   [register your Entity Secret](https://developers.circle.com/wallets/dev-controlled/register-entity-secret)

## Set up your environment

Before deploying any template, you need a working project and a funded
dev-controlled wallet on Arc Testnet. Complete the steps in this section once.
Then reuse the same wallet and credentials across all template deployments
below.

### Step 1: Set up your project

Set up your local environment and install the required dependencies.

#### 1.1. Create a new project

Create a new directory. Navigate to it and start a new project with default
settings.

<CodeGroup>
  ```shell Node.js theme={null}
  mkdir hello-arc
  cd hello-arc
  npm init -y
  npm pkg set type=module

  # Add run scripts for wallet creation and contract deployment
  npm pkg set scripts.create-wallet="tsx --env-file=.env create-wallet.ts"
  npm pkg set scripts.check-balance="tsx --env-file=.env check-balance.ts"
  npm pkg set scripts.deploy-erc20="tsx --env-file=.env deploy-erc20.ts"
  npm pkg set scripts.deploy-erc721="tsx --env-file=.env deploy-erc721.ts"
  npm pkg set scripts.deploy-erc1155="tsx --env-file=.env deploy-erc1155.ts"
  npm pkg set scripts.deploy-airdrop="tsx --env-file=.env deploy-airdrop.ts"
  npm pkg set scripts.check-transaction="tsx --env-file=.env check-transaction.ts"
  npm pkg set scripts.get-contract="tsx --env-file=.env get-contract.ts"
  ```

  ```shell Python theme={null}
  mkdir hello-arc
  cd hello-arc
  python3 -m venv .venv
  source .venv/bin/activate
  ```
</CodeGroup>

#### 1.2. Install dependencies

In the project directory, install the
[Circle Dev-Controlled Wallets SDK](https://developers.circle.com/wallets/dev-controlled)
and the [Circle Contracts SDK](https://developers.circle.com/sdks).
Dev-Controlled Wallets are Circle-managed wallets that your app controls via
APIs. You can deploy contracts and submit transactions without managing private
keys directly. You can also call the
[Circle Wallets API](https://developers.circle.com/api-reference/wallets/) and
[Circle Contracts API](https://developers.circle.com/api-reference/contracts/)
directly if you can't use the SDKs in your project.

<CodeGroup>
  ```shell Node.js theme={null}
  npm install @circle-fin/developer-controlled-wallets @circle-fin/smart-contract-platform
  npm install --save-dev tsx typescript @types/node
  ```

  ```shell Python theme={null}
  pip install circle-smart-contract-platform circle-developer-controlled-wallets
  ```
</CodeGroup>

#### 1.3. Initialize and configure the project

This command creates a `tsconfig.json` file:

<CodeGroup>
  ```shell Node.js theme={null}
  # Initialize a TypeScript project
  npx tsc --init
  ```

  ```shell Python theme={null}
  # Python doesn't require TypeScript configuration
  ```
</CodeGroup>

Then, edit the `tsconfig.json` file:

<CodeGroup>
  ```shell Node.js theme={null}
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

  ```shell Python theme={null}
  # Python doesn't require TypeScript configuration
  ```
</CodeGroup>

#### 1.4 Configure environment variables

Create a `.env` file in the project directory with your Circle credentials.
Replace these placeholders with your own credentials:

* `CIRCLE_API_KEY`: your API key should be either environment-prefixed (for
  example, `TEST_API_KEY:abc123:def456` or `LIVE_API_KEY:xyz:uvw`) or
  base64-encoded strings.
* `CIRCLE_ENTITY_SECRET`: your entity secret should be 64 lowercase alphanumeric
  characters.
* `CIRCLE_WEB3_API_KEY`: (Python only) set to the same value as `CIRCLE_API_KEY`
  for Python SDK compatibility.

```shell  theme={null}
echo "CIRCLE_API_KEY={YOUR_API_KEY}
CIRCLE_ENTITY_SECRET={YOUR_ENTITY_SECRET}
CIRCLE_WEB3_API_KEY={YOUR_API_KEY}
WALLET_ID={WALLET_ID_FROM_STEP_2}
WALLET_ADDRESS={WALLET_ADDRESS_FROM_STEP_2}
TRANSACTION_ID={TRANSACTION_ID_FROM_DEPLOYMENT}
CONTRACT_ID={CONTRACT_ID_FROM_DEPLOYMENT}" > .env
```

<Note>
  You'll update `WALLET_ID` and `WALLET_ADDRESS` after creating your wallet in
  Step 2, then update `TRANSACTION_ID` and `CONTRACT_ID` after running the
  deployment script in Step 4.
</Note>

<Warning>
  Important: These are sensitive credentials. Do not commit them to version
  control or share them publicly.
</Warning>

### Step 2: Set up your wallet

Create a dev-controlled wallet and fund it with testnet USDC. This covers gas
fees for deploying your smart contract.

#### 2.1. Create a wallet

Import the Wallets SDK and start the client with your API key and Entity Secret.
Dev-controlled wallets are created in a
[wallet set](https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet#1-create-a-wallet-set).
The wallet set is the source from which wallet keys are derived.

<CodeGroup>
  ```ts create-wallet.ts theme={null}
  import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET,
  });

  // Create a wallet set
  const walletSetResponse = await client.createWalletSet({
    name: "Wallet Set 1",
  });

  // Create a wallet on Arc Testnet
  const walletsResponse = await client.createWallets({
    blockchains: ["ARC-TESTNET"],
    count: 1,
    walletSetId: walletSetResponse.data?.walletSet?.id ?? "",
    accountType: "SCA",
  });

  console.log(JSON.stringify(walletsResponse.data, null, 2));
  ```

  ```python create_wallet.py theme={null}
  from circle.web3 import utils, developer_controlled_wallets
  import os
  import json

  client = utils.init_developer_controlled_wallets_client(
      api_key=os.getenv("CIRCLE_API_KEY"),
      entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
  )

  wallet_sets_api = developer_controlled_wallets.WalletSetsApi(client)
  wallets_api = developer_controlled_wallets.WalletsApi(client)

  # Create a wallet set
  wallet_set = wallet_sets_api.create_wallet_set(
      developer_controlled_wallets.CreateWalletSetRequest.from_dict({
          "name": "Wallet Set 1"
      })
  )

  # Create a wallet on Arc Testnet
  wallet = wallets_api.create_wallet(
      developer_controlled_wallets.CreateWalletRequest.from_dict({
          "blockchains": ["ARC-TESTNET"],
          "count": 1,
          "walletSetId": wallet_set.data.wallet_set.actual_instance.id,
          "accountType": "SCA"
      })
  )

  print(json.dumps(wallet.data.to_dict(), indent=2))
  ```
</CodeGroup>

**Run the script:**

<CodeGroup>
  ```shell Node.js theme={null}
  npm run create-wallet
  ```

  ```shell Python theme={null}
  python create_wallet.py
  ```
</CodeGroup>

**Response:**

<Note>
  If you're calling the API directly, you'll need two requests. One to [create
  the wallet
  set](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/create-wallet-set).
  One to [create the
  wallet](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/create-wallet).

  Be sure to replace the
  [Entity Secret ciphertext](https://developers.circle.com/wallets/dev-controlled/entity-secret-management#what-is-an-entity-secret-ciphertext)
  and the idempotency key in your request. If you're using the SDKs, this is
  handled for you.
</Note>

You should now have a newly created dev-controlled wallet. The API response will
look similar to the following:

```json  theme={null}
{
  "wallets": [
    {
      "id": "45692c3e-2ffa-5c5b-a99c-61366939114c",
      "state": "LIVE",
      "walletSetId": "ee58db40-22b4-55cb-9ce6-3444cb6efd2f",
      "custodyType": "DEVELOPER",
      "address": "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
      "blockchain": "ARC-TESTNET",
      "accountType": "SCA",
      "updateDate": "2026-01-20T09:39:16Z",
      "createDate": "2026-01-20T09:39:16Z",
      "scaCore": "circle_6900_singleowner_v3"
    }
  ]
}
```

<Note>
  **Why SCA wallets?** Smart Contract Accounts (SCA) on Arc Testnet work with
  [Gas Station](https://developers.circle.com/wallets/gas-station) to
  automatically sponsor transaction fees. Learn more about [Gas Station policies
  and setup](https://developers.circle.com/wallets/gas-station).
</Note>

***

<Tabs>
  <Tab title="ERC-20">
    ## Deploy an ERC-20 contract

    ERC-20 is the standard for fungible tokens. Use this template for tokenized
    assets, treasury instruments, governance tokens, or programmable money.

    ### Step 3: Prepare for deployment

    #### 3.1. Get your wallet information

    Retrieve your wallet ID from Step 2. Ensure:

    * Wallet custody type is **Dev-Controlled**
    * Blockchain is **Arc Testnet**
    * Account type is **SCA** (Smart Contract Account, recommended for Gas Station
      compatibility)

    Note your wallet's address for subsequent steps.

    #### 3.2. Understand deployment parameters

    | Parameter                | Description                                                                                                                                                      |
    | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `idempotencyKey`         | A unique value to prevent duplicate requests.                                                                                                                    |
    | `name`                   | The offchain contract name (visible in Circle Console only). Use `MyTokenContract`.                                                                              |
    | `walletId`               | The ID of the wallet deploying the contract. Use your dev-controlled wallet ID.                                                                                  |
    | `templateId`             | The template identifier. Use `a1b74add-23e0-4712-88d1-6b3009e85a86` for ERC-20. See [Templates](https://developers.circle.com/contracts/scp-templates-overview). |
    | `blockchain`             | The network to deploy onto. Use `ARC-TESTNET`.                                                                                                                   |
    | `entitySecretCiphertext` | The re-encrypted entity secret. See [Entity Secret Management](https://developers.circle.com/wallets/dev-controlled/entity-secret-management).                   |
    | `feeLevel`               | The fee level for transaction processing. Use `MEDIUM`.                                                                                                          |
    | `templateParameters`     | The onchain initialization parameters (see below).                                                                                                               |

    #### 3.3. Template parameters

    **Required Parameters:**

    | Parameter              | Type   | Description                                                                         |
    | :--------------------- | :----- | :---------------------------------------------------------------------------------- |
    | `name`                 | String | The onchain contract name. Use `MyToken`.                                           |
    | `defaultAdmin`         | String | The address with administrator permissions. Use your Dev-Controlled Wallet address. |
    | `primarySaleRecipient` | String | The address that receives proceeds from first-time sales. Use your wallet address.  |

    **Optional Parameters:**

    | Parameter              | Type       | Description                                                                                                |
    | :--------------------- | :--------- | :--------------------------------------------------------------------------------------------------------- |
    | `symbol`               | String     | The token symbol (for example, `MTK`).                                                                     |
    | `platformFeeRecipient` | String     | The address that receives platform fees from sales. Set this when implementing platform fee revenue share. |
    | `platformFeePercent`   | Float      | The platform fee percentage as decimal (for example, `0.1` for 10%). Requires `platformFeeRecipient`.      |
    | `contractUri`          | String     | The URL for the contract metadata.                                                                         |
    | `trustedForwarders`    | Strings\[] | A list of addresses that can forward ERC2771 meta-transactions to this contract.                           |

    ### Step 4: Deploy the smart contract

    Deploy by making a request to
    [`POST /templates/{id}/deploy`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/deploy-contract-template):

    <CodeGroup>
      ```ts deploy-erc20.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const response = await circleContractSdk.deployContractTemplate({
        id: "a1b74add-23e0-4712-88d1-6b3009e85a86",
        blockchain: "ARC-TESTNET",
        name: "MyTokenContract",
        walletId: process.env.WALLET_ID,
        templateParameters: {
          name: "MyToken",
          symbol: "MTK",
          defaultAdmin: process.env.WALLET_ADDRESS,
          primarySaleRecipient: process.env.WALLET_ADDRESS,
        },
        fee: {
          type: "level",
          config: {
            feeLevel: "MEDIUM",
          },
        },
      });

      console.log(JSON.stringify(response.data, null, 2));
      ```

      ```python deploy_erc20.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      import os
      import json

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.TemplatesApi(scpClient)

      request = smart_contract_platform.TemplateContractDeploymentRequest.from_dict({
          "blockchain": "ARC-TESTNET",
          "name": "MyTokenContract",
          "walletId": os.getenv("WALLET_ID"),
          "templateParameters": {
              "name": "MyToken",
              "symbol": "MTK",
              "defaultAdmin": os.getenv("WALLET_ADDRESS"),
              "primarySaleRecipient": os.getenv("WALLET_ADDRESS"),
          },
          "feeLevel": "MEDIUM"
      })

      response = api_instance.deploy_contract_template("a1b74add-23e0-4712-88d1-6b3009e85a86", request)

      print(json.dumps(response.data.to_dict(), indent=2))
      ```

      ```shell cURL theme={null}
      curl --request POST \
        --url https://api.circle.com/v1/w3s/templates/a1b74add-23e0-4712-88d1-6b3009e85a86/deploy \
        --header 'Authorization: Bearer <API_KEY>' \
        --header 'Content-Type: application/json' \
        --data '
      {
        "idempotencyKey": "<string>",
        "entitySecretCiphertext": "<string>",
        "blockchain": "ARC-TESTNET",
        "walletId": "<WALLET_ID>",
        "name": "MyTokenContract",
        "templateParameters": {
          "name": "MyToken",
          "symbol": "MTK",
          "defaultAdmin": "<DEFAULT_ADMIN_ADDRESS>",
          "primarySaleRecipient": "<PRIMARY_SALE_ADDRESS>"
        },
        "feeLevel": "MEDIUM"
      }
      '
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run deploy-erc20
      ```

      ```shell Python theme={null}
      python deploy_erc20.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contractIds": ["019c053d-1ed1-772b-91a8-6970003dad8d"],
      "transactionId": "5b6185b2-f9a1-5645-9db2-ca5d9a330794"
    }
    ```

    <Note>
      A successful response indicates deployment has been **initiated**, not
      completed. Use the `transactionId` to check the deployment status in the next
      step.
    </Note>

    #### 4.1. Check deployment status

    You can check the status of the deployment from the
    [Circle Developer Console](https://console.circle.com/smart-contracts/contracts)
    or by calling
    [`GET /transactions/{id}`](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-transaction).

    After running the deployment script, copy the `transactionId` from the response
    and update your `.env` file with `TRANSACTION_ID={your-transaction-id}`. Then
    run the check-transaction script to verify deployment status.

    <CodeGroup>
      ```ts check-transaction.ts theme={null}
      import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

      const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const transactionResponse = await circleDeveloperSdk.getTransaction({
        id: process.env.TRANSACTION_ID!,
      });

      console.log(JSON.stringify(transactionResponse.data, null, 2));
      ```

      ```python check_transaction.py theme={null}
      from circle.web3 import utils, developer_controlled_wallets
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      client = utils.init_developer_controlled_wallets_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = developer_controlled_wallets.TransactionsApi(client)
      transaction_response = api_instance.get_transaction(
          id=os.getenv("TRANSACTION_ID")
      )

      print(json.dumps(transaction_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run check-transaction
      ```

      ```shell Python theme={null}
      python check_transaction.py
      ```
    </CodeGroup>

    <Note>
      Transaction status may show PENDING immediately after deployment. Wait 10-30
      seconds and re-run check-transaction to see COMPLETE status.
    </Note>

    **Response:**

    ```json  theme={null}
    {
      "transaction": {
        "id": "601a0815-f749-41d8-b193-22cadd2a8977",
        "blockchain": "ARC-TESTNET",
        "walletId": "45692c3e-2ffa-5c5b-a99c-61366939114c",
        "sourceAddress": "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
        "contractAddress": "0x281156899e5bd6fecf1c0831ee24894eeeaea2f8",
        "transactionType": "OUTBOUND",
        "custodyType": "DEVELOPER",
        "state": "COMPLETE",
        "amounts": [],
        "nfts": null,
        "txHash": "0x3bfbab5d5ce0d1a5d682cbc742d3940cf59db0369d173b71ba2a3b8f43bfbcb1",
        "blockHash": "0x7d12148f9331556b31f84f58a41b7ff16eaaa47940f9e86733037d7ab74d858e",
        "blockHeight": 23686153,
        "userOpHash": "0x66befac1a371fcdddf1566215e4677127e111dff9253f306f7096fed8642a208",
        "networkFee": "0.044628774800664",
        "firstConfirmDate": "2026-01-26T08:59:56Z",
        "operation": "CONTRACT_EXECUTION",
        "feeLevel": "MEDIUM",
        "estimatedFee": {
          "gasLimit": "500797",
          "networkFee": "0.16506442157883425",
          "baseFee": "160",
          "priorityFee": "9.60345525",
          "maxFee": "329.60345525"
        },
        "refId": "",
        "abiFunctionSignature": "mintTo(address,uint256)",
        "abiParameters": [
          "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
          "1000000000000000000"
        ],
        "createDate": "2026-01-26T08:59:54Z",
        "updateDate": "2026-01-26T08:59:56Z"
      }
    }
    ```

    #### 4.2. Get the contract address

    After deployment completes, retrieve the contract address using
    [`GET /contracts/{id}`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/get-contract).

    After deployment completes, copy the `contractIds[0]` from the deployment
    response and update your `.env` file with `CONTRACT_ID={your-contract-id}`. Then
    run the get-contract script to retrieve the contract address.

    <CodeGroup>
      ```ts get-contract.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const contractResponse = await circleContractSdk.getContract({
        id: process.env.CONTRACT_ID!,
      });

      console.log(JSON.stringify(contractResponse.data, null, 2));
      ```

      ```python get_contract.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.ViewUpdateApi(scpClient)
      contract_response = api_instance.get_contract(
          id=os.getenv("CONTRACT_ID")
      )

      print(json.dumps(contract_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run get-contract
      ```

      ```shell Python theme={null}
      python get_contract.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contract": {
        "id": "b7c35372-ce69-4ccd-bfaa-504c14634f0d",
        "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "blockchain": "ARC-TESTNET",
        "status": "COMPLETE"
      }
    }
    ```

    Once your contract is deployed, you can interact with it from your application.
    You'll be able to view the contract both in the
    [Circle Developer Console](https://console.circle.com/smart-contracts/contracts)
    and on the [Arc Testnet Explorer](https://testnet.arcscan.app/).

    <Note>
      **Initial Supply:** The contract starts with 0 token supply at deployment. Use
      the `mintTo` function to create tokens and assign them to addresses as needed.
    </Note>

    ***
  </Tab>

  <Tab title="ERC-721">
    ## Deploy an ERC-721 contract

    ERC-721 is the standard for unique digital assets. Use this template for
    ownership certificates, tokenized assets, unique financial instruments, or
    distinct asset representation.

    ### Step 3: Prepare for deployment

    #### 3.1. Get your wallet information

    Retrieve your wallet ID from Step 2. Ensure:

    * Wallet custody type is **Dev-Controlled**
    * Blockchain is **Arc Testnet**
    * Account type is **SCA** (Smart Contract Account, recommended for Gas Station
      compatibility)

    Note your wallet's address for subsequent steps.

    #### 3.2. Understand deployment parameters

    | Parameter                | Description                                                                                                                                                       |
    | :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `idempotencyKey`         | A unique value to prevent duplicate requests.                                                                                                                     |
    | `name`                   | The offchain contract name (visible in Circle Console only). Use `MyTokenContract`.                                                                               |
    | `walletId`               | The ID of the wallet deploying the contract. Use your dev-controlled wallet ID.                                                                                   |
    | `templateId`             | The template identifier. Use `76b83278-50e2-4006-8b63-5b1a2a814533` for ERC-721. See [Templates](https://developers.circle.com/contracts/scp-templates-overview). |
    | `blockchain`             | The network to deploy onto. Use `ARC-TESTNET`.                                                                                                                    |
    | `entitySecretCiphertext` | The re-encrypted entity secret. See [Entity Secret Management](https://developers.circle.com/wallets/dev-controlled/entity-secret-management).                    |
    | `feeLevel`               | The fee level for transaction processing. Use `MEDIUM`.                                                                                                           |
    | `templateParameters`     | The onchain initialization parameters (see below).                                                                                                                |

    #### 3.3. Template parameters

    **Required Parameters:**

    | Parameter              | Type   | Description                                                                         |
    | :--------------------- | :----- | :---------------------------------------------------------------------------------- |
    | `name`                 | String | The onchain contract name. Use `MyToken`.                                           |
    | `defaultAdmin`         | String | The address with administrator permissions. Use your Dev-Controlled Wallet address. |
    | `primarySaleRecipient` | String | The address for first-time sale proceeds. Use your Dev-Controlled Wallet address.   |
    | `royaltyRecipient`     | String | The address for secondary sale royalties. Use your Dev-Controlled Wallet address.   |
    | `royaltyPercent`       | Float  | The royalty share as a decimal (for example, `0.01` for 1%). Use `0.01`.            |

    **Optional Parameters:**

    | Parameter              | Type       | Description                                                                                                |
    | :--------------------- | :--------- | :--------------------------------------------------------------------------------------------------------- |
    | `symbol`               | String     | The token symbol (for example, `MTK`).                                                                     |
    | `platformFeeRecipient` | String     | The address that receives platform fees from sales. Set this when implementing platform fee revenue share. |
    | `platformFeePercent`   | Float      | The platform fee percentage as decimal (for example, `0.1` for 10%). Requires `platformFeeRecipient`.      |
    | `contractUri`          | String     | The URL for the contract metadata.                                                                         |
    | `trustedForwarders`    | Strings\[] | A list of addresses that can forward ERC2771 meta-transactions to this contract.                           |

    ### Step 4: Deploy the smart contract

    Deploy by making a request to
    [`POST /templates/{id}/deploy`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/deploy-contract-template):

    <CodeGroup>
      ```ts deploy-erc721.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const response = await circleContractSdk.deployContractTemplate({
        id: "76b83278-50e2-4006-8b63-5b1a2a814533",
        blockchain: "ARC-TESTNET",
        name: "MyTokenContract",
        walletId: process.env.WALLET_ID,
        templateParameters: {
          name: "MyToken",
          symbol: "MTK",
          defaultAdmin: process.env.WALLET_ADDRESS,
          primarySaleRecipient: process.env.WALLET_ADDRESS,
          royaltyRecipient: process.env.WALLET_ADDRESS,
          royaltyPercent: 0.01,
        },
        fee: {
          type: "level",
          config: {
            feeLevel: "MEDIUM",
          },
        },
      });

      console.log(JSON.stringify(response.data, null, 2));
      ```

      ```python deploy_erc721.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      import os
      import json

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.TemplatesApi(scpClient)

      request = smart_contract_platform.TemplateContractDeploymentRequest.from_dict({
          "blockchain": "ARC-TESTNET",
          "name": "MyTokenContract",
          "walletId": os.getenv("WALLET_ID"),
          "templateParameters": {
              "name": "MyToken",
              "symbol": "MTK",
              "defaultAdmin": os.getenv("WALLET_ADDRESS"),
              "primarySaleRecipient": os.getenv("WALLET_ADDRESS"),
              "royaltyRecipient": os.getenv("WALLET_ADDRESS"),
              "royaltyPercent": "0.01",
          },
          "feeLevel": "MEDIUM"
      })

      request.template_parameters["royaltyPercent"] = 0.01

      response = api_instance.deploy_contract_template("76b83278-50e2-4006-8b63-5b1a2a814533", request)

      print(json.dumps(response.data.to_dict(), indent=2))
      ```

      ```shell cURL theme={null}
      curl --request POST \
        --url https://api.circle.com/v1/w3s/templates/76b83278-50e2-4006-8b63-5b1a2a814533/deploy \
        --header 'Authorization: Bearer <API_KEY>' \
        --header 'Content-Type: application/json' \
        --data '
      {
        "idempotencyKey": "<string>",
        "entitySecretCiphertext": "<string>",
        "blockchain": "ARC-TESTNET",
        "walletId": "<WALLET_ID>",
        "name": "MyTokenContract",
        "templateParameters": {
          "name": "MyToken",
          "symbol": "MTK",
          "defaultAdmin": "<WALLET_ADDRESS>",
          "primarySaleRecipient": "<WALLET_ADDRESS>",
          "royaltyRecipient": "<WALLET_ADDRESS>",
          "royaltyPercent": 0.01
        },
        "feeLevel": "MEDIUM"
      }
      '
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run deploy-erc721
      ```

      ```shell Python theme={null}
      python deploy_erc721.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contractIds": ["019c053d-1ed1-772b-91a8-6970003dad8d"],
      "transactionId": "5b6185b2-f9a1-5645-9db2-ca5d9a330794"
    }
    ```

    <Note>
      A successful response indicates deployment has been **initiated**, not
      completed. Use the `transactionId` to check the deployment status in the next
      step.
    </Note>

    #### 4.1. Check deployment status

    Verify deployment with
    [`GET /transactions/{id}`](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-transaction).

    After running the deployment script, copy the `transactionId` from the response
    and update your `.env` file with `TRANSACTION_ID={your-transaction-id}`. Then
    run the check-transaction script to verify deployment status.

    <CodeGroup>
      ```ts check-transaction.ts theme={null}
      import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

      const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const transactionResponse = await circleDeveloperSdk.getTransaction({
        id: process.env.TRANSACTION_ID!,
      });

      console.log(JSON.stringify(transactionResponse.data, null, 2));
      ```

      ```python check_transaction.py theme={null}
      from circle.web3 import utils, developer_controlled_wallets
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      client = utils.init_developer_controlled_wallets_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = developer_controlled_wallets.TransactionsApi(client)
      transaction_response = api_instance.get_transaction(
          id=os.getenv("TRANSACTION_ID")
      )

      print(json.dumps(transaction_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run check-transaction
      ```

      ```shell Python theme={null}
      python check_transaction.py
      ```
    </CodeGroup>

    <Note>
      Transaction status may show PENDING immediately after deployment. Wait 10-30
      seconds and re-run check-transaction to see COMPLETE status.
    </Note>

    **Response:**

    ```json  theme={null}
    {
      "transaction": {
        "id": "601a0815-f749-41d8-b193-22cadd2a8977",
        "blockchain": "ARC-TESTNET",
        "walletId": "45692c3e-2ffa-5c5b-a99c-61366939114c",
        "sourceAddress": "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
        "contractAddress": "0x281156899e5bd6fecf1c0831ee24894eeeaea2f8",
        "transactionType": "OUTBOUND",
        "custodyType": "DEVELOPER",
        "state": "COMPLETE",
        "amounts": [],
        "nfts": null,
        "txHash": "0x3bfbab5d5ce0d1a5d682cbc742d3940cf59db0369d173b71ba2a3b8f43bfbcb1",
        "blockHash": "0x7d12148f9331556b31f84f58a41b7ff16eaaa47940f9e86733037d7ab74d858e",
        "blockHeight": 23686153,
        "userOpHash": "0x66befac1a371fcdddf1566215e4677127e111dff9253f306f7096fed8642a208",
        "networkFee": "0.044628774800664",
        "firstConfirmDate": "2026-01-26T08:59:56Z",
        "operation": "CONTRACT_EXECUTION",
        "feeLevel": "MEDIUM",
        "estimatedFee": {
          "gasLimit": "500797",
          "networkFee": "0.16506442157883425",
          "baseFee": "160",
          "priorityFee": "9.60345525",
          "maxFee": "329.60345525"
        },
        "refId": "",
        "abiFunctionSignature": "mintTo(address,uint256)",
        "abiParameters": [
          "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
          "1000000000000000000"
        ],
        "createDate": "2026-01-26T08:59:54Z",
        "updateDate": "2026-01-26T08:59:56Z"
      }
    }
    ```

    #### 4.2. Get the contract address

    After deployment completes, retrieve the contract address using
    [`GET /contracts/{id}`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/get-contract).

    After deployment completes, copy the `contractIds[0]` from the deployment
    response and update your `.env` file with `CONTRACT_ID={your-contract-id}`. Then
    run the get-contract script to retrieve the contract address.

    <CodeGroup>
      ```ts get-contract.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const contractResponse = await circleContractSdk.getContract({
        id: process.env.CONTRACT_ID!,
      });

      console.log(JSON.stringify(contractResponse.data, null, 2));
      ```

      ```python get_contract.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.ViewUpdateApi(scpClient)
      contract_response = api_instance.get_contract(
          id=os.getenv("CONTRACT_ID")
      )

      print(json.dumps(contract_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run get-contract
      ```

      ```shell Python theme={null}
      python get_contract.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contract": {
        "id": "b7c35372-ce69-4ccd-bfaa-504c14634f0d",
        "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "blockchain": "ARC-TESTNET",
        "status": "COMPLETE"
      }
    }
    ```

    ***
  </Tab>

  <Tab title="ERC-1155">
    ## Deploy an ERC-1155 contract

    ERC-1155 is the standard for multi-asset token management. Use this template for
    structured products, tiered assets, batch settlements, or managing diverse asset
    portfolios.

    ### Step 3: Prepare for deployment

    #### 3.1. Get your wallet information

    Retrieve your wallet ID from Step 2. Ensure:

    * Wallet custody type is **Dev-Controlled**
    * Blockchain is **Arc Testnet**
    * Account type is **SCA** (Smart Contract Account, recommended for Gas Station
      compatibility)

    Note your wallet's address for subsequent steps.

    #### 3.2. Understand deployment parameters

    | Parameter                | Description                                                                                                                                                        |
    | :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `idempotencyKey`         | A unique value to prevent duplicate requests.                                                                                                                      |
    | `name`                   | The offchain contract name (visible in Circle Console only). Use `MyMultiTokenContract`.                                                                           |
    | `walletId`               | The ID of the wallet deploying the contract. Use your dev-controlled wallet ID.                                                                                    |
    | `templateId`             | The template identifier. Use `aea21da6-0aa2-4971-9a1a-5098842b1248` for ERC-1155. See [Templates](https://developers.circle.com/contracts/scp-templates-overview). |
    | `blockchain`             | The network to deploy onto. Use `ARC-TESTNET`.                                                                                                                     |
    | `entitySecretCiphertext` | The re-encrypted entity secret. See [Entity Secret Management](https://developers.circle.com/wallets/dev-controlled/entity-secret-management).                     |
    | `feeLevel`               | The fee level for transaction processing. Use `MEDIUM`.                                                                                                            |
    | `templateParameters`     | The onchain initialization parameters (see below).                                                                                                                 |

    #### 3.3. Template parameters

    **Required Parameters:**

    | Parameter              | Type   | Description                                                                         |
    | :--------------------- | :----- | :---------------------------------------------------------------------------------- |
    | `name`                 | String | The onchain contract name. Use `MyMultiToken`.                                      |
    | `defaultAdmin`         | String | The address with administrator permissions. Use your Dev-Controlled Wallet address. |
    | `primarySaleRecipient` | String | The address for first-time sale proceeds. Use your Dev-Controlled Wallet address.   |
    | `royaltyRecipient`     | String | The address for secondary sale royalties. Use your Dev-Controlled Wallet address.   |
    | `royaltyPercent`       | Float  | The royalty share as a decimal (for example, `0.01` for 1%). Use `0.01`.            |

    **Optional Parameters:**

    | Parameter              | Type       | Description                                                                                                |
    | :--------------------- | :--------- | :--------------------------------------------------------------------------------------------------------- |
    | `symbol`               | String     | The token symbol (for example, `MMTK`).                                                                    |
    | `platformFeeRecipient` | String     | The address that receives platform fees from sales. Set this when implementing platform fee revenue share. |
    | `platformFeePercent`   | Float      | The platform fee percentage as decimal (for example, `0.1` for 10%). Requires `platformFeeRecipient`.      |
    | `contractUri`          | String     | The URL for the contract metadata.                                                                         |
    | `trustedForwarders`    | Strings\[] | A list of addresses that can forward ERC2771 meta-transactions to this contract.                           |

    ### Step 4: Deploy the smart contract

    Deploy by making a request to
    [`POST /templates/{id}/deploy`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/deploy-contract-template):

    <CodeGroup>
      ```ts deploy-erc1155.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const response = await circleContractSdk.deployContractTemplate({
        id: "aea21da6-0aa2-4971-9a1a-5098842b1248",
        blockchain: "ARC-TESTNET",
        name: "MyMultiTokenContract",
        walletId: process.env.WALLET_ID,
        templateParameters: {
          name: "MyMultiToken",
          symbol: "MMTK",
          defaultAdmin: process.env.WALLET_ADDRESS,
          primarySaleRecipient: process.env.WALLET_ADDRESS,
          royaltyRecipient: process.env.WALLET_ADDRESS,
          royaltyPercent: 0.01,
        },
        fee: {
          type: "level",
          config: {
            feeLevel: "MEDIUM",
          },
        },
      });

      console.log(JSON.stringify(response.data, null, 2));
      ```

      ```python deploy_erc1155.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      import os
      import json

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.TemplatesApi(scpClient)

      request = smart_contract_platform.TemplateContractDeploymentRequest.from_dict({
          "blockchain": "ARC-TESTNET",
          "name": "MyMultiTokenContract",
          "walletId": os.getenv("WALLET_ID"),
          "templateParameters": {
              "name": "MyMultiToken",
              "symbol": "MMTK",
              "defaultAdmin": os.getenv("WALLET_ADDRESS"),
              "primarySaleRecipient": os.getenv("WALLET_ADDRESS"),
              "royaltyRecipient": os.getenv("WALLET_ADDRESS"),
              "royaltyPercent": "0.01",
          },
          "feeLevel": "MEDIUM"
      })

      request.template_parameters["royaltyPercent"] = 0.01

      response = api_instance.deploy_contract_template("aea21da6-0aa2-4971-9a1a-5098842b1248", request)

      print(json.dumps(response.data.to_dict(), indent=2))
      ```

      ```shell cURL theme={null}
      curl --request POST \
        --url https://api.circle.com/v1/w3s/templates/aea21da6-0aa2-4971-9a1a-5098842b1248/deploy \
        --header 'Authorization: Bearer <API_KEY>' \
        --header 'Content-Type: application/json' \
        --data '
      {
        "idempotencyKey": "<string>",
        "entitySecretCiphertext": "<string>",
        "blockchain": "ARC-TESTNET",
        "walletId": "<WALLET_ID>",
        "name": "MyMultiTokenContract",
        "templateParameters": {
          "name": "MyMultiToken",
          "symbol": "MMTK",
          "defaultAdmin": "<WALLET_ADDRESS>",
          "primarySaleRecipient": "<WALLET_ADDRESS>",
          "royaltyRecipient": "<WALLET_ADDRESS>",
          "royaltyPercent": 0.01
        },
        "feeLevel": "MEDIUM"
      }
      '
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run deploy-erc1155
      ```

      ```shell Python theme={null}
      python deploy_erc1155.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contractIds": ["019c053d-1ed1-772b-91a8-6970003dad8d"],
      "transactionId": "5b6185b2-f9a1-5645-9db2-ca5d9a330794"
    }
    ```

    <Note>
      A successful response indicates deployment has been **initiated**, not
      completed. Use the `transactionId` to check the deployment status in the next
      step.
    </Note>

    #### 4.1. Check deployment status

    Verify deployment with
    [`GET /transactions/{id}`](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-transaction).

    After running the deployment script, copy the `transactionId` from the response
    and update your `.env` file with `TRANSACTION_ID={your-transaction-id}`. Then
    run the check-transaction script to verify deployment status.

    <CodeGroup>
      ```ts check-transaction.ts theme={null}
      import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

      const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const transactionResponse = await circleDeveloperSdk.getTransaction({
        id: process.env.TRANSACTION_ID!,
      });

      console.log(JSON.stringify(transactionResponse.data, null, 2));
      ```

      ```python check_transaction.py theme={null}
      from circle.web3 import utils, developer_controlled_wallets
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      client = utils.init_developer_controlled_wallets_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = developer_controlled_wallets.TransactionsApi(client)
      transaction_response = api_instance.get_transaction(
          id=os.getenv("TRANSACTION_ID")
      )

      print(json.dumps(transaction_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run check-transaction
      ```

      ```shell Python theme={null}
      python check_transaction.py
      ```
    </CodeGroup>

    <Note>
      Transaction status may show PENDING immediately after deployment. Wait 10-30
      seconds and re-run check-transaction to see COMPLETE status.
    </Note>

    **Response:**

    ```json  theme={null}
    {
      "transaction": {
        "id": "601a0815-f749-41d8-b193-22cadd2a8977",
        "blockchain": "ARC-TESTNET",
        "walletId": "45692c3e-2ffa-5c5b-a99c-61366939114c",
        "sourceAddress": "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
        "contractAddress": "0x281156899e5bd6fecf1c0831ee24894eeeaea2f8",
        "transactionType": "OUTBOUND",
        "custodyType": "DEVELOPER",
        "state": "COMPLETE",
        "amounts": [],
        "nfts": null,
        "txHash": "0x3bfbab5d5ce0d1a5d682cbc742d3940cf59db0369d173b71ba2a3b8f43bfbcb1",
        "blockHash": "0x7d12148f9331556b31f84f58a41b7ff16eaaa47940f9e86733037d7ab74d858e",
        "blockHeight": 23686153,
        "userOpHash": "0x66befac1a371fcdddf1566215e4677127e111dff9253f306f7096fed8642a208",
        "networkFee": "0.044628774800664",
        "firstConfirmDate": "2026-01-26T08:59:56Z",
        "operation": "CONTRACT_EXECUTION",
        "feeLevel": "MEDIUM",
        "estimatedFee": {
          "gasLimit": "500797",
          "networkFee": "0.16506442157883425",
          "baseFee": "160",
          "priorityFee": "9.60345525",
          "maxFee": "329.60345525"
        },
        "refId": "",
        "abiFunctionSignature": "mintTo(address,uint256)",
        "abiParameters": [
          "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
          "1000000000000000000"
        ],
        "createDate": "2026-01-26T08:59:54Z",
        "updateDate": "2026-01-26T08:59:56Z"
      }
    }
    ```

    #### 4.2. Get the contract address

    After deployment completes, retrieve the contract address using
    [`GET /contracts/{id}`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/get-contract).

    After deployment completes, copy the `contractIds[0]` from the deployment
    response and update your `.env` file with `CONTRACT_ID={your-contract-id}`. Then
    run the get-contract script to retrieve the contract address.

    <CodeGroup>
      ```ts get-contract.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const contractResponse = await circleContractSdk.getContract({
        id: process.env.CONTRACT_ID!,
      });

      console.log(JSON.stringify(contractResponse.data, null, 2));
      ```

      ```python get_contract.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.ViewUpdateApi(scpClient)
      contract_response = api_instance.get_contract(
          id=os.getenv("CONTRACT_ID")
      )

      print(json.dumps(contract_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run get-contract
      ```

      ```shell Python theme={null}
      python get_contract.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contract": {
        "id": "b7c35372-ce69-4ccd-bfaa-504c14634f0d",
        "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "blockchain": "ARC-TESTNET",
        "status": "COMPLETE"
      }
    }
    ```

    ***
  </Tab>

  <Tab title="Airdrop">
    ## Deploy an airdrop contract

    The Airdrop template enables mass token distribution to many recipients. Use
    this template for treasury distributions, stakeholder settlements, operational
    payments, or programmatic capital allocation.

    ### Step 3: Prepare for deployment

    #### 3.1. Get your wallet information

    Retrieve your wallet ID from Step 2. Ensure:

    * Wallet custody type is **Dev-Controlled**
    * Blockchain is **Arc Testnet**
    * Account type is **SCA** (Smart Contract Account, recommended for Gas Station
      compatibility)

    Note your wallet's address for subsequent steps.

    #### 3.2. Understand deployment parameters

    | Parameter                | Description                                                                                                                                                       |
    | :----------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `idempotencyKey`         | A unique value to prevent duplicate requests.                                                                                                                     |
    | `name`                   | The offchain contract name (visible in Circle Console only). Use `MyAirdropContract`.                                                                             |
    | `walletId`               | The ID of the wallet deploying the contract. Use your dev-controlled wallet ID.                                                                                   |
    | `templateId`             | The template identifier. Use `13e322f2-18dc-4f57-8eed-4bddfc50f85e` for Airdrop. See [Templates](https://developers.circle.com/contracts/scp-templates-overview). |
    | `blockchain`             | The network to deploy onto. Use `ARC-TESTNET`.                                                                                                                    |
    | `entitySecretCiphertext` | The re-encrypted entity secret. See [Entity Secret Management](https://developers.circle.com/wallets/dev-controlled/entity-secret-management).                    |
    | `feeLevel`               | The fee level for transaction processing. Use `MEDIUM`.                                                                                                           |
    | `templateParameters`     | The onchain initialization parameters (see below).                                                                                                                |

    #### 3.3. Template parameters

    **Required Parameters:**

    | Parameter      | Type   | Description                                                                         |
    | :------------- | :----- | :---------------------------------------------------------------------------------- |
    | `defaultAdmin` | String | The address with administrator permissions. Use your Dev-Controlled Wallet address. |

    **Optional Parameters:**

    | Parameter     | Type   | Description                        |
    | :------------ | :----- | :--------------------------------- |
    | `contractURI` | String | The URL for the contract metadata. |

    ### Step 4: Deploy the smart contract

    Deploy by making a request to
    [`POST /templates/{id}/deploy`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/deploy-contract-template):

    <CodeGroup>
      ```ts deploy-airdrop.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const response = await circleContractSdk.deployContractTemplate({
        id: "13e322f2-18dc-4f57-8eed-4bddfc50f85e",
        blockchain: "ARC-TESTNET",
        name: "MyAirdropContract",
        walletId: process.env.WALLET_ID,
        templateParameters: {
          defaultAdmin: process.env.WALLET_ADDRESS,
        },
        fee: {
          type: "level",
          config: {
            feeLevel: "MEDIUM",
          },
        },
      });

      console.log(JSON.stringify(response.data, null, 2));
      ```

      ```python deploy_airdrop.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      import os
      import json

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.TemplatesApi(scpClient)

      request = smart_contract_platform.TemplateContractDeploymentRequest.from_dict({
          "blockchain": "ARC-TESTNET",
          "name": "MyAirdropContract",
          "walletId": os.getenv("WALLET_ID"),
          "templateParameters": {
              "defaultAdmin": os.getenv("WALLET_ADDRESS"),
          },
          "feeLevel": "MEDIUM"
      })

      response = api_instance.deploy_contract_template("13e322f2-18dc-4f57-8eed-4bddfc50f85e", request)

      print(json.dumps(response.data.to_dict(), indent=2))
      ```

      ```shell cURL theme={null}
      curl --request POST \
        --url https://api.circle.com/v1/w3s/templates/13e322f2-18dc-4f57-8eed-4bddfc50f85e/deploy \
        --header 'Authorization: Bearer <API_KEY>' \
        --header 'Content-Type: application/json' \
        --data '
      {
        "idempotencyKey": "<string>",
        "entitySecretCiphertext": "<string>",
        "blockchain": "ARC-TESTNET",
        "walletId": "<WALLET_ID>",
        "name": "MyAirdropContract",
        "templateParameters": {
          "defaultAdmin": "<WALLET_ADDRESS>"
        },
        "feeLevel": "MEDIUM"
      }
      '
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run deploy-airdrop
      ```

      ```shell Python theme={null}
      python deploy_airdrop.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contractIds": ["019c053d-1ed1-772b-91a8-6970003dad8d"],
      "transactionId": "5b6185b2-f9a1-5645-9db2-ca5d9a330794"
    }
    ```

    <Note>
      A successful response indicates deployment has been **initiated**, not
      completed. Use the `transactionId` to check the deployment status in the next
      step.
    </Note>

    #### 4.1. Check deployment status

    Verify deployment with
    [`GET /transactions/{id}`](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/get-transaction).

    After running the deployment script, copy the `transactionId` from the response
    and update your `.env` file with `TRANSACTION_ID={your-transaction-id}`. Then
    run the check-transaction script to verify deployment status.

    <CodeGroup>
      ```ts check-transaction.ts theme={null}
      import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

      const circleDeveloperSdk = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const transactionResponse = await circleDeveloperSdk.getTransaction({
        id: process.env.TRANSACTION_ID!,
      });

      console.log(JSON.stringify(transactionResponse.data, null, 2));
      ```

      ```python check_transaction.py theme={null}
      from circle.web3 import utils, developer_controlled_wallets
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      client = utils.init_developer_controlled_wallets_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = developer_controlled_wallets.TransactionsApi(client)
      transaction_response = api_instance.get_transaction(
          id=os.getenv("TRANSACTION_ID")
      )

      print(json.dumps(transaction_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run check-transaction
      ```

      ```shell Python theme={null}
      python check_transaction.py
      ```
    </CodeGroup>

    <Note>
      Transaction status may show PENDING immediately after deployment. Wait 10-30
      seconds and re-run check-transaction to see COMPLETE status.
    </Note>

    **Response:**

    ```json  theme={null}
    {
      "transaction": {
        "id": "601a0815-f749-41d8-b193-22cadd2a8977",
        "blockchain": "ARC-TESTNET",
        "walletId": "45692c3e-2ffa-5c5b-a99c-61366939114c",
        "sourceAddress": "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
        "contractAddress": "0x281156899e5bd6fecf1c0831ee24894eeeaea2f8",
        "transactionType": "OUTBOUND",
        "custodyType": "DEVELOPER",
        "state": "COMPLETE",
        "amounts": [],
        "nfts": null,
        "txHash": "0x3bfbab5d5ce0d1a5d682cbc742d3940cf59db0369d173b71ba2a3b8f43bfbcb1",
        "blockHash": "0x7d12148f9331556b31f84f58a41b7ff16eaaa47940f9e86733037d7ab74d858e",
        "blockHeight": 23686153,
        "userOpHash": "0x66befac1a371fcdddf1566215e4677127e111dff9253f306f7096fed8642a208",
        "networkFee": "0.044628774800664",
        "firstConfirmDate": "2026-01-26T08:59:56Z",
        "operation": "CONTRACT_EXECUTION",
        "feeLevel": "MEDIUM",
        "estimatedFee": {
          "gasLimit": "500797",
          "networkFee": "0.16506442157883425",
          "baseFee": "160",
          "priorityFee": "9.60345525",
          "maxFee": "329.60345525"
        },
        "refId": "",
        "abiFunctionSignature": "mintTo(address,uint256)",
        "abiParameters": [
          "0xbcf83d3b112cbf43b19904e376dd8dee01fe2758",
          "1000000000000000000"
        ],
        "createDate": "2026-01-26T08:59:54Z",
        "updateDate": "2026-01-26T08:59:56Z"
      }
    }
    ```

    #### 4.2. Get the contract address

    After deployment completes, retrieve the contract address using
    [`GET /contracts/{id}`](https://developers.circle.com/api-reference/contracts/smart-contract-platform/get-contract).

    After deployment completes, copy the `contractIds[0]` from the deployment
    response and update your `.env` file with `CONTRACT_ID={your-contract-id}`. Then
    run the get-contract script to retrieve the contract address.

    <CodeGroup>
      ```ts get-contract.ts theme={null}
      import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

      const circleContractSdk = initiateSmartContractPlatformClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      const contractResponse = await circleContractSdk.getContract({
        id: process.env.CONTRACT_ID!,
      });

      console.log(JSON.stringify(contractResponse.data, null, 2));
      ```

      ```python get_contract.py theme={null}
      from circle.web3 import utils, smart_contract_platform
      from pathlib import Path
      from dotenv import load_dotenv
      import os
      import json

      # Load environment variables
      env_path = Path(__file__).resolve().parent / ".env"
      load_dotenv(env_path)

      scpClient = utils.init_smart_contract_platform_client(
          api_key=os.getenv("CIRCLE_API_KEY"),
          entity_secret=os.getenv("CIRCLE_ENTITY_SECRET")
      )

      api_instance = smart_contract_platform.ViewUpdateApi(scpClient)
      contract_response = api_instance.get_contract(
          id=os.getenv("CONTRACT_ID")
      )

      print(json.dumps(contract_response.data.to_dict(), indent=2, default=str))
      ```
    </CodeGroup>

    **Run the script:**

    <CodeGroup>
      ```shell Node.js theme={null}
      npm run get-contract
      ```

      ```shell Python theme={null}
      python get_contract.py
      ```
    </CodeGroup>

    **Response:**

    ```json  theme={null}
    {
      "contract": {
        "id": "b7c35372-ce69-4ccd-bfaa-504c14634f0d",
        "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
        "blockchain": "ARC-TESTNET",
        "status": "COMPLETE"
      }
    }
    ```

    ***
  </Tab>
</Tabs>

***

## Summary

After completing this tutorial, you've successfully:

* Created a dev-controlled wallet on Arc Testnet
* Funded your wallet with testnet USDC
* Deployed a smart contract using Contract Templates
* Retrieved your contract address

---