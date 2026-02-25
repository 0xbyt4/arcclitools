# arc-cli

CLI tool for [Arc Network](https://arc.network) - Circle's EVM-compatible L1 blockchain with USDC as native gas token.

Arc is a Layer-1 blockchain built by Circle where USDC serves as the native gas token (18 decimals on-chain, 6 decimals in ERC-20 interface). This CLI provides a unified interface for all Arc Network operations: wallet management, token transfers, cross-chain bridging, smart contract deployment, and x402 payment protocol.

## Features

- **Wallet Management** - Create, import, and manage wallets (local EOA + Circle developer-controlled)
- **Token Transfers** - Send USDC, EURC, USYC on Arc with simple commands
- **Batch Transfers** - Send tokens to multiple recipients from a CSV file
- **Cross-Chain Bridge** - Bridge USDC to/from Arc via Circle's CCTP
- **Gateway** - Unified crosschain USDC balance via Circle Gateway
- **Smart Contracts** - Deploy with Foundry or Circle templates, interact, verify
- **On-Chain Messages** - Write and read messages on the blockchain
- **DEX** - Interact with DEX contracts for swaps and liquidity
- **x402 Protocol** - HTTP 402 payment server and client for AI agent monetization
- **Block Explorer** - Open transactions, addresses, contracts in Arcscan
- **Network Info** - Chain details, EVM differences, provider directory

## Installation

```bash
# Clone and install
git clone https://github.com/0xbyt4/arcclitools.git
cd arcclitools
npm install

# Run via tsx (development)
npx tsx bin/arc-cli.ts --help

# Or build and use globally
npm run build
npm link
arc --help
```

**Requirements:** Node.js >= 18.0.0

## Quick Start

```bash
# 1. Set up configuration
arc config set api-key <your-circle-api-key>
arc config set entity-secret <your-entity-secret>

# 2. Check network info
arc network info

# 3. Create a wallet
arc wallet create

# 4. Check balance
arc wallet balance <address>

# 5. Send USDC
arc send 10 0xRecipientAddress
```

## Configuration

Configuration can be set via CLI, environment variables, or `.env` file.

```bash
# CLI config (persistent, stored in ~/.config/arc-cli)
arc config set api-key <value>
arc config set entity-secret <value>
arc config set rpc-url <value>
arc config set private-key <value>
arc config set x402-port <value>
arc config set x402-price <value>
arc config set pinata-jwt <value>

# View config
arc config get <key>
arc config list

# Reset all config
arc config reset
```

Copy `.env.example` to `.env` for environment-based configuration:

```bash
cp .env.example .env
```

**Priority:** CLI config > environment variable > default value

## Commands

### Network

```bash
arc network info          # Chain ID, RPC URL, WebSocket, Explorer, Faucet
arc network status        # RPC connection check + block height
arc network gas           # Current gas price in USDC
```

### Wallet

```bash
arc wallet create         # Create Circle developer-controlled wallet
arc wallet generate       # Generate local EOA keypair
arc wallet list           # List wallets
arc wallet balance [addr] # Check USDC/EURC/USYC balance
arc wallet fund [addr]    # Request testnet tokens from faucet
```

### Send & Transfer

```bash
# Send tokens (uses private key from config/.env)
arc send <amount> <recipient>              # Send USDC
arc send <amount> <recipient> --token eurc # Send EURC

# Batch send from file (amount per recipient)
arc multisend <file> <amount>
arc multisend wallets.txt 100 --token eurc

# Transfer via Circle wallets
arc transfer usdc -f <from> -t <to> -a <amount>
arc transfer eurc -f <from> -t <to> -a <amount>
arc transfer status <tx-hash>
```

### Bridge (CCTP)

```bash
# Bridge USDC to Arc from another chain
arc bridge to-arc -c Ethereum_Sepolia -f <addr> -t <addr> -a <amount>

# Bridge USDC from Arc to another chain
arc bridge from-arc -c Base_Sepolia -f <addr> -t <addr> -a <amount>
```

Supported chains: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, Avalanche Fuji, Optimism Sepolia, Polygon Amoy, Unichain Sepolia, and more.

### Gateway

```bash
arc gateway deposit -w <wallet-id> -a <amount>                                        # Deposit to unified balance
arc gateway transfer -w <wallet-id> -f <source> -t <dest> -c ETH-SEPOLIA -a <amount>  # Transfer via gateway
arc gateway balance -w <wallet-id>                                                     # Check gateway balance
```

### Smart Contracts

```bash
# Deploy tokens, NFTs, DEX
arc deploy token MyToken MTK 1000000
arc deploy nft MyNFT MNFT 100 --image ./logo.png
arc deploy dex
arc deploy list                         # List all deployments
arc deploy verify <address>             # Verify on Blockscout

# Deploy with custom Solidity file
arc deploy token MyToken MTK 1000000 --sol ./MyToken.sol

# Deploy Circle templates
arc contract deploy --template erc20 --name "MyToken" --symbol "MTK" -w <wallet-id>

# Interact with contracts (read/write)
arc contract interact -a <contract-addr> -f "balanceOf(address)" --args <addr>
arc contract interact -a <contract-addr> -f "transfer(address,uint256)" --args <addr> 100 --write
```

### On-Chain Messages

```bash
arc message write "Hello Arc!"                  # Write message to self
arc message write "GM" -t <recipient-address>   # Write message to someone
```

### DEX

```bash
arc dex create-pool <token-addr> --dex <dex-addr>              # Create USDC/Token pool
arc dex add-liquidity <token> <usdc-amt> <token-amt> --dex ... # Add liquidity
arc dex remove-liquidity <token> --dex <dex-addr>              # Remove liquidity
arc dex swap <amount> usdc <token-addr> --dex <dex-addr>       # Swap USDC -> Token
arc dex swap <amount> <token-addr> usdc --dex <dex-addr>       # Swap Token -> USDC
arc dex quote <amount> usdc <token-addr> --dex <dex-addr>      # Get quote
arc dex pools --dex <dex-addr>                                 # List pools
```

### x402 Protocol

x402 is an HTTP 402 payment protocol that enables AI agents to pay for API access with USDC.

```bash
# Start a payment-gated server
arc x402 server --port 3000 --price 0.01 --pay-to <your-address>
arc x402 server --routes routes.json    # Custom route pricing

# Test an x402 endpoint
arc x402 test <url>

# Pay for an x402 resource
arc x402 pay <url>
```

### Transaction & Explorer

```bash
# Transaction details
arc tx status <hash>

# Open in Arcscan explorer
arc explore tx <hash>
arc explore address <addr>
arc explore contract <addr>
```

### Info & Reference

```bash
arc addresses list                  # All known contract addresses
arc addresses list -c stablecoins   # Filter by category

arc info evm                        # EVM compatibility differences
arc info providers                  # Node providers, indexers, AA providers
arc info providers -c node          # Filter by category
arc info compliance                 # Compliance vendors

arc docs open                       # Open Arc docs in browser
arc docs search <query>             # Search local docs
```

## Arc Network Details

| Property     | Value                             |
| ------------ | --------------------------------- |
| Chain ID     | 5042002                           |
| RPC URL      | `https://rpc.testnet.arc.network` |
| WebSocket    | `wss://rpc.testnet.arc.network`   |
| Explorer     | https://testnet.arcscan.app       |
| Faucet       | https://faucet.circle.com         |
| Native Token | USDC (18 decimals)                |
| CCTP Domain  | 26                                |

### Key Contract Addresses (Testnet)

| Contract         | Address                                      |
| ---------------- | -------------------------------------------- |
| USDC             | `0x3600000000000000000000000000000000000000` |
| EURC             | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |
| USYC             | `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C` |
| GatewayWallet    | `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` |
| TokenMessengerV2 | `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA` |
| Multicall3       | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Permit2          | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |

Run `arc addresses list` for the full list.

## Development

```bash
# Run in development mode
npx tsx bin/arc-cli.ts <command>

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build
```

## Testing

The project has 434 tests (332 Vitest + 102 Foundry):

```bash
# Run all Vitest tests
npm test

# Run Foundry tests (requires Foundry installed)
forge test
```

**Test coverage includes:**

- Unit tests for all services (Circle Wallets, Bridge, Gateway, Contracts, Pinata)
- CLI command integration tests (config, network, addresses, info, validation)
- Input validation (addresses, amounts, URLs, chain names)
- Config store and environment variable fallback chains
- RPC chain definitions and gas formatting utilities
- x402 server and client
- Formatter and validator utilities

## CI/CD

GitHub Actions runs on every push and PR:

1. **TypeScript Check** - `tsc --noEmit`
2. **Lint & Format** - ESLint + Prettier
3. **Vitest** - All unit and integration tests
4. **Foundry** - Smart contract tests

## Project Structure

```
arcclitools/
├── bin/
│   └── arc-cli.ts              # CLI executable entry point
├── src/
│   ├── index.ts                # Commander setup, command registration
│   ├── commands/               # CLI command definitions (18 commands)
│   ├── services/               # SDK wrappers and business logic
│   │   ├── circle-wallets.ts   # Circle Developer-Controlled Wallets
│   │   ├── circle-contracts.ts # Circle Smart Contract Platform
│   │   ├── bridge.ts           # Circle Bridge Kit (CCTP)
│   │   ├── gateway.ts          # Circle Gateway
│   │   ├── rpc.ts              # viem public/wallet client
│   │   ├── x402-client.ts      # @x402/fetch wrapper
│   │   ├── x402-server.ts      # @x402/express wrapper
│   │   ├── foundry.ts          # Foundry CLI wrapper
│   │   └── pinata.ts           # Pinata IPFS uploads
│   ├── config/
│   │   ├── constants.ts        # Network constants, contract addresses
│   │   ├── store.ts            # Persistent config (~/.config/arc-cli)
│   │   └── env.ts              # Environment variable loading
│   ├── utils/
│   │   ├── validator.ts        # Address, amount, URL validation
│   │   ├── formatter.ts        # Output formatting
│   │   ├── logger.ts           # Colored output + spinners
│   │   └── prompts.ts          # Interactive prompts
│   ├── contracts/              # Solidity contracts and ABIs
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── test/                       # 332 Vitest tests + 102 Foundry tests
├── templates/                  # x402 server templates
└── arc-docs/                   # Arc Network documentation
```

## License

MIT
