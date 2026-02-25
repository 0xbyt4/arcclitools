# arc-cli Command Reference

Complete reference for all 58 commands across 18 command groups.

---

## Table of Contents

- [config](#config) - CLI configuration management
- [network](#network) - Network info, status, gas
- [wallet](#wallet) - Wallet creation and management
- [send](#send) - Send tokens with local private key
- [multisend](#multisend) - Batch send to multiple addresses
- [deploy](#deploy) - Deploy tokens, NFTs, DEX contracts
- [message](#message) - On-chain messages
- [transfer](#transfer) - Transfer via Circle Wallets
- [bridge](#bridge) - Cross-chain USDC bridging (CCTP)
- [gateway](#gateway) - Circle Gateway unified balance
- [contract](#contract) - Contract deploy, interact, verify, events
- [tx](#tx) - Transaction operations
- [x402](#x402) - HTTP 402 payment protocol
- [explore](#explore) - Open in block explorer
- [addresses](#addresses) - Known contract addresses
- [info](#info) - Network info and ecosystem
- [docs](#docs) - Documentation access
- [dex](#dex) - DEX swap and liquidity

---

## config

Manage CLI configuration. Values are stored persistently in `~/.config/arc-cli/arcrc.json`.

### `arc config set <key> <value>`

Set a configuration value.

**Valid keys:** `api-key`, `entity-secret`, `rpc-url`, `network`, `private-key`, `x402-port`, `x402-price`, `pinata-jwt`

```bash
arc config set api-key YOUR_CIRCLE_API_KEY
arc config set private-key 0xabc123...
arc config set pinata-jwt eyJ...
```

### `arc config get <key>`

Get a configuration value. Sensitive values are masked.

```bash
arc config get api-key
```

### `arc config list`

List all configuration values.

```bash
arc config list
```

### `arc config reset`

Reset all configuration to defaults. Prompts for confirmation.

```bash
arc config reset
```

---

## network

Arc network information and status.

### `arc network info`

Show Arc network details (Chain ID, RPC URL, WebSocket, Explorer, Faucet).

```bash
arc network info
```

### `arc network status`

Check RPC connection and current block height.

```bash
arc network status
```

### `arc network gas`

Show current gas price in Gwei and estimated transfer cost in USDC.

```bash
arc network gas
```

---

## wallet

Wallet management - both local EOA and Circle developer-controlled wallets.

### `arc wallet create`

Create a Circle developer-controlled wallet on Arc Testnet.

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Wallet set name (default: "Arc CLI Wallet Set") |
| `-c, --count <count>` | Number of wallets to create (default: 1) |

```bash
arc wallet create
arc wallet create -n "My Wallets" -c 3
```

**Requires:** `api-key` and `entity-secret` in config.

### `arc wallet generate`

Generate a local EOA keypair and save to `.env`.

| Option | Description |
|--------|-------------|
| `--no-save` | Do not save to .env file |

```bash
arc wallet generate
arc wallet generate --no-save
```

### `arc wallet list`

List Circle developer-controlled wallets.

```bash
arc wallet list
```

**Requires:** `api-key` and `entity-secret` in config.

### `arc wallet balance [address]`

Check wallet balance (USDC, EURC, USYC). If no address provided, uses `WALLET_ADDRESS` from `.env`.

```bash
arc wallet balance
arc wallet balance 0x1234...abcd
```

### `arc wallet fund [address]`

Request testnet USDC/EURC via Circle Faucet API.

| Option | Description |
|--------|-------------|
| `--usdc` | Request USDC tokens (default: true) |
| `--eurc` | Request EURC tokens |
| `--no-usdc` | Skip USDC tokens |
| `--browser` | Open faucet in browser instead of API call |

```bash
arc wallet fund
arc wallet fund 0x1234...abcd --eurc
arc wallet fund --browser
```

---

## send

Send USDC or ERC-20 tokens on Arc using private key from `.env`.

### `arc send <amount> [to]`

| Argument | Description |
|----------|-------------|
| `<amount>` | Amount to send |
| `[to]` | Recipient address (prompted if not provided) |

| Option | Description |
|--------|-------------|
| `-t, --token <token>` | Token: `eurc`, `usyc`, or contract address (default: native USDC) |

```bash
arc send 10 0xRecipient...
arc send 100 0xRecipient... --token eurc
arc send 50 0xRecipient... --token 0xTokenAddress...
```

**Requires:** `PRIVATE_KEY` in `.env` or config.

---

## multisend

Send tokens to multiple addresses from a file.

### `arc multisend <file> <amount>`

| Argument | Description |
|----------|-------------|
| `<file>` | Text file with one wallet address per line (`#` for comments) |
| `<amount>` | Amount to send to each address |

| Option | Description |
|--------|-------------|
| `-t, --token <token>` | Token: `eurc`, `usyc`, or contract address (default: native USDC) |

```bash
arc multisend wallets.txt 0.5
arc multisend wallets.txt 100 --token eurc
arc multisend wallets.txt 50 --token 0xTokenAddress...
```

Example `wallets.txt`:
```
# My recipients
0x1234...abcd
0x5678...efgh
```

**Requires:** `PRIVATE_KEY` in `.env` or config.

---

## deploy

Deploy and manage contracts on Arc. Deployments are saved to `deployments.json`.

### `arc deploy token <name> <symbol> <supply>`

Deploy an ERC-20 token.

| Argument | Description |
|----------|-------------|
| `<name>` | Token name |
| `<symbol>` | Token symbol |
| `<supply>` | Initial supply (whole tokens, e.g. 1000000) |

| Option | Description |
|--------|-------------|
| `--sol <path>` | Custom Solidity file instead of default SimpleToken |

```bash
arc deploy token MyToken MTK 1000000
arc deploy token MyToken MTK 1000000 --sol ./MyToken.sol
```

### `arc deploy nft <name> <symbol> <supply>`

Deploy an ERC-721 NFT collection with on-chain or IPFS metadata.

| Argument | Description |
|----------|-------------|
| `<name>` | Collection name |
| `<symbol>` | Collection symbol |
| `<supply>` | Max supply |

| Option | Description |
|--------|-------------|
| `--image <path>` | Image file (PNG, JPG, GIF, SVG, WebP) -- **required** |
| `--ipfs` | Upload image to IPFS via Pinata (recommended for images > 24KB) |
| `--description <text>` | Collection description |
| `--mint <quantity>` | Mint tokens to deployer after deploy |
| `--sol <path>` | Custom Solidity file instead of default SimpleNFT |

```bash
arc deploy nft MyNFT MNFT 100 --image ./logo.png
arc deploy nft MyNFT MNFT 100 --image ./art.png --ipfs
arc deploy nft MyNFT MNFT 100 --image ./art.png --description "My collection" --mint 10
```

Without `--ipfs`: image stored on-chain as base64 (max ~24KB).
With `--ipfs`: image uploaded to IPFS via Pinata (any size, requires `PINATA_JWT`).

### `arc deploy dex`

Deploy a SimpleDEX (AMM) contract - constant product AMM with 0.3% swap fee.

| Option | Description |
|--------|-------------|
| `--sol <path>` | Custom Solidity file instead of default SimpleDEX |

```bash
arc deploy dex
arc deploy dex --sol ./MyDEX.sol
```

### `arc deploy list`

List all deployed contracts from `deployments.json`.

```bash
arc deploy list
```

### `arc deploy verify <address>`

Verify a deployed contract on Blockscout.

| Argument | Description |
|----------|-------------|
| `<address>` | Contract address to verify |

| Option | Description |
|--------|-------------|
| `--sol <path>` | Solidity source file (auto-detected from deployments.json if omitted) |

```bash
arc deploy verify 0xContractAddress...
arc deploy verify 0xContractAddress... --sol ./MyToken.sol
```

---

## message

Write or read messages on the Arc blockchain.

### `arc message write <text>`

Write a message on-chain as transaction calldata.

| Argument | Description |
|----------|-------------|
| `<text>` | Message to write |

| Option | Description |
|--------|-------------|
| `-t, --to <address>` | Recipient address (default: self) |

```bash
arc message write "Hello Arc!"
arc message write "GM" -t 0xRecipient...
```

### `arc message read <hash>`

Read a message from a transaction's calldata.

| Argument | Description |
|----------|-------------|
| `<hash>` | Transaction hash |

```bash
arc message read 0xTxHash...
```

---

## transfer

Transfer stablecoins via Circle Developer-Controlled Wallets API.

**Requires:** `api-key` and `entity-secret` in config.

For simple transfers with a local private key, use `arc send` instead.

### `arc transfer usdc`

Transfer USDC via Circle Wallets.

| Option | Description |
|--------|-------------|
| `-f, --from <address>` | Sender wallet address |
| `-t, --to <address>` | Recipient address |
| `-a, --amount <amount>` | Amount to transfer |

```bash
arc transfer usdc -f 0xSender... -t 0xRecipient... -a 100
```

### `arc transfer eurc`

Transfer EURC via Circle Wallets.

| Option | Description |
|--------|-------------|
| `-f, --from <address>` | Sender wallet address |
| `-t, --to <address>` | Recipient address |
| `-a, --amount <amount>` | Amount to transfer |

```bash
arc transfer eurc -f 0xSender... -t 0xRecipient... -a 50
```

### `arc transfer status <txId>`

Check transfer status by Circle transaction ID.

| Argument | Description |
|----------|-------------|
| `<txId>` | Circle transaction ID |

```bash
arc transfer status tx-abc-123
```

---

## bridge

Bridge USDC to/from Arc via Circle's Cross-Chain Transfer Protocol (CCTP).

**Requires:** `api-key` and `entity-secret` in config.

**Supported chains:** Arbitrum Sepolia, Avalanche Fuji, Base Sepolia, Ethereum Sepolia, Optimism Sepolia, Polygon Amoy, Solana Devnet, Unichain Sepolia.

### `arc bridge to-arc`

Bridge USDC from another chain to Arc Testnet.

| Option | Description |
|--------|-------------|
| `-c, --chain <chain>` | Source chain (e.g. `Ethereum_Sepolia`, `Base_Sepolia`) |
| `-f, --from <address>` | Source wallet address |
| `-t, --to <address>` | Destination address on Arc |
| `-a, --amount <amount>` | Amount of USDC to bridge |

```bash
arc bridge to-arc -c Ethereum_Sepolia -f 0xSrc... -t 0xDst... -a 10
arc bridge to-arc -c Base_Sepolia -f 0xSrc... -t 0xDst... -a 100
```

### `arc bridge from-arc`

Bridge USDC from Arc to another chain.

| Option | Description |
|--------|-------------|
| `-c, --chain <chain>` | Destination chain |
| `-f, --from <address>` | Source wallet address on Arc |
| `-t, --to <address>` | Destination address |
| `-a, --amount <amount>` | Amount of USDC to bridge |

```bash
arc bridge from-arc -c Ethereum_Sepolia -f 0xSrc... -t 0xDst... -a 10
arc bridge from-arc -c Base_Sepolia -f 0xSrc... -t 0xDst... -a 50
```

### `arc bridge status <txHash>`

Check bridge transaction status. Opens transaction in explorer.

| Argument | Description |
|----------|-------------|
| `<txHash>` | Transaction hash |

```bash
arc bridge status 0xTxHash...
```

---

## gateway

Circle Gateway - unified crosschain USDC balance.

**Requires:** `api-key` and `entity-secret` in config.

### `arc gateway deposit`

Deposit USDC into Gateway unified balance.

| Option | Description |
|--------|-------------|
| `-w, --wallet-id <id>` | Circle wallet ID |
| `-a, --amount <amount>` | Amount to deposit |

```bash
arc gateway deposit -w wallet123 -a 100
```

### `arc gateway transfer`

Transfer USDC via Gateway to another chain.

| Option | Description |
|--------|-------------|
| `-w, --wallet-id <id>` | Circle wallet ID |
| `-f, --from <address>` | Source wallet address on Arc |
| `-t, --to <address>` | Destination address |
| `-c, --chain <blockchain>` | Destination blockchain (e.g. `ETH-SEPOLIA`, `BASE-SEPOLIA`) |
| `-a, --amount <amount>` | Amount to transfer |

```bash
arc gateway transfer -w wallet123 -f 0xSource... -t 0xDest... -c ETH-SEPOLIA -a 50
```

### `arc gateway balance <walletId>`

Check Gateway unified balance.

| Argument | Description |
|----------|-------------|
| `<walletId>` | Circle wallet ID |

```bash
arc gateway balance wallet123
```

---

## contract

Smart contract deployment and interaction.

### `arc contract deploy`

Deploy a smart contract on Arc Testnet via Foundry or Circle templates.

| Option | Description |
|--------|-------------|
| `--foundry` | Deploy using Foundry (`forge create`) |
| `--template <type>` | Deploy Circle template: `erc20`, `erc721`, `erc1155`, `airdrop` |
| `-c, --contract <path>` | Contract path (for Foundry: `src/Contract.sol:Contract`) |
| `-w, --wallet-id <id>` | Circle wallet ID (for template deploy) |
| `-n, --name <name>` | Contract/token name |
| `-s, --symbol <symbol>` | Token symbol |
| `--args <args...>` | Constructor arguments (for Foundry) |

```bash
# Foundry deploy
arc contract deploy --foundry -c src/MyContract.sol:MyContract

# Circle template deploy
arc contract deploy --template erc20 -n "MyToken" -s "MTK" -w wallet123
```

### `arc contract interact`

Call a contract function (read or write).

| Option | Description |
|--------|-------------|
| `-a, --address <address>` | Contract address |
| `-f, --function <sig>` | Function signature (e.g. `balanceOf(address)`) |
| `--args <args...>` | Function arguments |
| `--write` | Send a transaction (write operation, requires `PRIVATE_KEY`) |

```bash
# Read call
arc contract interact -a 0xContract... -f "balanceOf(address)" --args 0xAddr...

# Write call
arc contract interact -a 0xContract... -f "transfer(address,uint256)" --args 0xTo... 100 --write
```

### `arc contract verify`

Verify a contract on Blockscout.

| Option | Description |
|--------|-------------|
| `-a, --address <address>` | Contract address |
| `-c, --contract <path>` | Contract source path |
| `--args <args...>` | Constructor arguments |

```bash
arc contract verify -a 0xContract... -c src/MyContract.sol:MyContract
```

### `arc contract import`

Import an existing contract to Circle platform.

| Option | Description |
|--------|-------------|
| `-a, --address <address>` | Contract address |
| `-n, --name <name>` | Contract name |

```bash
arc contract import -a 0xContract... -n "My Contract"
```

### `arc contract events monitor`

Create an event monitor (webhook).

| Option | Description |
|--------|-------------|
| `-a, --address <address>` | Contract address |
| `-e, --event <signature>` | Event signature (e.g. `Transfer(address,address,uint256)`) |

```bash
arc contract events monitor -a 0xContract... -e "Transfer(address,address,uint256)"
```

### `arc contract events logs`

Query event logs for a contract.

| Option | Description |
|--------|-------------|
| `-a, --address <address>` | Contract address |
| `-l, --limit <number>` | Number of logs to fetch (default: 20) |

```bash
arc contract events logs -a 0xContract...
arc contract events logs -a 0xContract... -l 50
```

---

## tx

Transaction operations.

### `arc tx status <hash>`

Check transaction status and details.

```bash
arc tx status 0xTxHash...
```

### `arc tx decode <hash>`

Decode transaction input data using Foundry's `4byte-decode`.

```bash
arc tx decode 0xTxHash...
```

### `arc tx receipt <hash>`

Get full transaction receipt.

```bash
arc tx receipt 0xTxHash...
```

---

## x402

x402 HTTP 402 payment protocol - enables AI agents to pay for API access with USDC.

### `arc x402 server`

Start an x402 payment-gated server.

| Option | Description |
|--------|-------------|
| `-p, --port <port>` | Server port |
| `--price <amount>` | Default price per request (USDC) |
| `--pay-to <address>` | Payment recipient address |
| `--routes <file>` | Route configuration file (JSON) |
| `-n, --network <network>` | Payment network (default: `base-sepolia`) |

```bash
arc x402 server --port 3000 --price 0.01 --pay-to 0xYourAddress...
arc x402 server --routes routes.json
```

### `arc x402 pay <url>`

Make a payment to an x402 endpoint.

| Argument | Description |
|----------|-------------|
| `<url>` | URL to pay for |

```bash
arc x402 pay https://api.example.com/data
```

### `arc x402 test <url>`

Test an x402 endpoint (check if it requires payment).

| Argument | Description |
|----------|-------------|
| `<url>` | URL to test |

```bash
arc x402 test https://api.example.com/data
```

### `arc x402 init`

Initialize x402 config and templates in current directory.

| Option | Description |
|--------|-------------|
| `--pay-to <address>` | Payment recipient address |
| `-n, --network <network>` | Payment network (default: `base-sepolia`) |

```bash
arc x402 init --pay-to 0xYourAddress...
```

---

## explore

Open resources in Arc block explorer (Arcscan).

### `arc explore tx <hash>`

Open transaction in explorer.

```bash
arc explore tx 0xTxHash...
```

### `arc explore address <addr>`

Open address in explorer.

```bash
arc explore address 0xAddress...
```

### `arc explore contract <addr>`

Open contract in explorer.

```bash
arc explore contract 0xContract...
```

---

## addresses

Known contract addresses on Arc Testnet.

### `arc addresses list`

List all known contract addresses.

| Option | Description |
|--------|-------------|
| `-c, --category <cat>` | Filter: `stablecoins`, `cctp`, `gateway`, `payments`, `common` |

```bash
arc addresses list
arc addresses list -c stablecoins
arc addresses list -c cctp
```

---

## info

Arc network information and ecosystem.

### `arc info evm`

Show EVM compatibility differences between Ethereum and Arc.

```bash
arc info evm
```

### `arc info providers`

List node providers, data indexers, and account abstraction providers.

| Option | Description |
|--------|-------------|
| `-c, --category <cat>` | Filter: `node`, `indexer`, `aa`, `compliance`, `explorer` |

```bash
arc info providers
arc info providers -c node
arc info providers -c aa
```

### `arc info compliance`

List compliance vendors for Arc.

```bash
arc info compliance
```

---

## docs

Arc documentation access.

### `arc docs open`

Open Arc documentation in browser.

```bash
arc docs open
```

### `arc docs search <query>`

Search local `arc-docs/` directory for a keyword.

| Argument | Description |
|----------|-------------|
| `<query>` | Search keyword |

| Option | Description |
|--------|-------------|
| `-l, --limit <number>` | Maximum results to show (default: 20) |

```bash
arc docs search "gas fees"
arc docs search "bridge" -l 5
```

---

## dex

Interact with SimpleDEX (AMM) - constant product AMM with 0.3% swap fee. All pools are Native USDC / ERC-20 token pairs.

### `arc dex create-pool <token>`

Create a new USDC/Token liquidity pool.

| Argument | Description |
|----------|-------------|
| `<token>` | ERC-20 token address |

| Option | Description |
|--------|-------------|
| `--dex <address>` | DEX contract address (auto-detected from deployments.json) |

```bash
arc dex create-pool 0xTokenAddress...
arc dex create-pool 0xTokenAddress... --dex 0xDEXAddress...
```

### `arc dex add-liquidity <token> <usdc-amount> <token-amount>`

Add liquidity to a USDC/Token pool. Token approval is handled automatically.

| Argument | Description |
|----------|-------------|
| `<token>` | ERC-20 token address |
| `<usdc-amount>` | Amount of USDC to add |
| `<token-amount>` | Amount of tokens to add |

| Option | Description |
|--------|-------------|
| `--dex <address>` | DEX contract address |

```bash
arc dex add-liquidity 0xToken... 100 50000
arc dex add-liquidity 0xToken... 10 1000 --dex 0xDEX...
```

### `arc dex remove-liquidity <token>`

Remove liquidity from a USDC/Token pool.

| Argument | Description |
|----------|-------------|
| `<token>` | ERC-20 token address |

| Option | Description |
|--------|-------------|
| `--amount <lp>` | LP token amount to remove (raw) |
| `--all` | Remove all your liquidity |
| `--dex <address>` | DEX contract address |

```bash
arc dex remove-liquidity 0xToken... --all
arc dex remove-liquidity 0xToken... --amount 1000 --dex 0xDEX...
```

### `arc dex swap <amount> <from> <to>`

Swap between USDC and an ERC-20 token.

| Argument | Description |
|----------|-------------|
| `<amount>` | Amount to swap |
| `<from>` | Source: `usdc` or token address |
| `<to>` | Destination: `usdc` or token address |

| Option | Description |
|--------|-------------|
| `--dex <address>` | DEX contract address |

```bash
arc dex swap 10 usdc 0xToken...           # Swap 10 USDC for tokens
arc dex swap 5000 0xToken... usdc          # Swap 5000 tokens for USDC
```

Get a quote first: `arc dex quote 10 usdc 0xToken...`

### `arc dex quote <amount> <from> <to>`

Get a swap quote without executing.

| Argument | Description |
|----------|-------------|
| `<amount>` | Amount to swap |
| `<from>` | Source: `usdc` or token address |
| `<to>` | Destination: `usdc` or token address |

| Option | Description |
|--------|-------------|
| `--dex <address>` | DEX contract address |

```bash
arc dex quote 10 usdc 0xToken...
arc dex quote 5000 0xToken... usdc
```

### `arc dex pools`

List all liquidity pools with reserves and pricing.

| Option | Description |
|--------|-------------|
| `--dex <address>` | DEX contract address |

```bash
arc dex pools
arc dex pools --dex 0xDEX...
```
