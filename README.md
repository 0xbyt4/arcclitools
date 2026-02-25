# arc-cli

CLI tool for [Arc Network](https://arc.network) - Circle's EVM-compatible L1 blockchain with USDC as native gas token.

Arc is a Layer-1 blockchain built by Circle where USDC serves as the native gas token (18 decimals on-chain, 6 decimals in ERC-20 interface). This CLI provides a unified interface for all Arc Network operations: wallet management, token transfers, cross-chain bridging, smart contract deployment, and x402 payment protocol.

## Features

- **Wallet Management** - Create and manage wallets (local EOA + Circle developer-controlled)
- **Token Transfers** - Send USDC, EURC, USYC on Arc with simple commands
- **Batch Transfers** - Send tokens to multiple recipients from a text file
- **Cross-Chain Bridge** - Bridge USDC to/from Arc via Circle's CCTP
- **Gateway** - Unified crosschain USDC balance via Circle Gateway
- **Smart Contracts** - Deploy tokens/NFTs/DEX, interact, verify, monitor events
- **On-Chain Messages** - Write and read messages on the blockchain
- **DEX** - Swap tokens, add/remove liquidity on constant product AMM
- **x402 Protocol** - HTTP 402 payment server and client for AI agent monetization
- **USYC Teller** - Mint/redeem yield-bearing USYC tokens, check rates and entitlements
- **StableFX** - Query and manage escrow-based FX trades (USDC/EURC swaps)
- **Block Explorer** - Open transactions, addresses, contracts in Arcscan
- **Network Info** - Chain details, EVM differences, provider directory
- **RPC Fallback** - Automatic failover across multiple RPC endpoints

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
# 1. Generate a local wallet
arc wallet generate

# 2. Check network status
arc network status

# 3. Fund wallet with testnet USDC
arc wallet fund

# 4. Check balance
arc wallet balance

# 5. Send USDC
arc send 10 0xRecipientAddress
```

For Circle SDK features (developer-controlled wallets, bridge, gateway), also configure:

```bash
arc config set api-key <your-circle-api-key>
arc config set entity-secret <your-entity-secret>
```

## Configuration

Configuration can be set via CLI, environment variables, or `.env` file.

```bash
# CLI config (persistent, stored in ~/.config/arc-cli)
arc config set api-key <value>
arc config set entity-secret <value>
arc config set rpc-url <value>
arc config set network <value>
arc config set private-key <value>
arc config set pinata-jwt <value>
arc config set x402-port <value>
arc config set x402-price <value>

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

For the full command reference with all options and flags, see [COMMANDS.md](COMMANDS.md).

### Network

```bash
arc network info          # Chain ID, RPC URL, WebSocket, Explorer, Faucet
arc network status        # RPC connection check + block height
arc network gas           # Current gas price in USDC
```

### Wallet

```bash
arc wallet create         # Create Circle developer-controlled wallet
arc wallet generate       # Generate local EOA keypair and save to .env
arc wallet list           # List Circle wallets
arc wallet balance [addr] # Check USDC/EURC/USYC balance
arc wallet fund [addr]    # Request testnet tokens from faucet
```

### Send & Transfer

```bash
# Send tokens (uses private key from .env)
arc send <amount> [to]                    # Send USDC (prompts for address if omitted)
arc send <amount> <to> --token eurc       # Send EURC
arc send <amount> <to> --token 0xToken... # Send custom ERC-20

# Batch send from text file (one address per line)
arc multisend wallets.txt 100
arc multisend wallets.txt 50 --token eurc

# Transfer via Circle developer-controlled wallets
arc transfer usdc -f <from> -t <to> -a <amount>
arc transfer eurc -f <from> -t <to> -a <amount>
arc transfer status <txId>
```

### Bridge (CCTP)

```bash
arc bridge to-arc -c Ethereum_Sepolia -f <addr> -t <addr> -a <amount>
arc bridge from-arc -c Base_Sepolia -f <addr> -t <addr> -a <amount>
arc bridge status <txHash>
```

Supported chains: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, Avalanche Fuji, Optimism Sepolia, Polygon Amoy, Unichain Sepolia, Solana Devnet.

### Gateway

```bash
arc gateway deposit -w <wallet-id> -a <amount>                                        # Deposit
arc gateway transfer -w <wallet-id> -f <source> -t <dest> -c ETH-SEPOLIA -a <amount>  # Transfer
arc gateway balance <walletId>                                                         # Balance
```

### Smart Contracts

```bash
# Deploy tokens, NFTs, DEX
arc deploy token MyToken MTK 1000000
arc deploy nft MyNFT MNFT 100 --image ./logo.png
arc deploy nft MyNFT MNFT 100 --image ./art.png --ipfs --mint 10
arc deploy dex
arc deploy list                         # List all deployments
arc deploy verify <address>             # Verify on Blockscout

# Deploy with custom Solidity file
arc deploy token MyToken MTK 1000000 --sol ./MyToken.sol

# Deploy Circle templates
arc contract deploy --template erc20 --name "MyToken" --symbol "MTK" -w <wallet-id>

# Interact with contracts (read/write)
arc contract interact -a <addr> -f "balanceOf(address)" --args 0x...
arc contract interact -a <addr> -f "transfer(address,uint256)" --args 0x... 100 --write

# Import, verify, monitor events
arc contract import -a <addr> -n "My Contract"
arc contract events monitor -a <addr> -e "Transfer(address,address,uint256)"
arc contract events logs -a <addr>
```

### On-Chain Messages

```bash
arc message write "Hello Arc!"                  # Write message to self
arc message write "GM" -t <recipient-address>   # Write message to someone
arc message read <txHash>                       # Read message from tx
```

### DEX

```bash
arc dex create-pool <token-addr> --dex <dex-addr>              # Create USDC/Token pool
arc dex add-liquidity <token> <usdc-amt> <token-amt> --dex ... # Add liquidity
arc dex remove-liquidity <token> --all --dex <dex-addr>        # Remove liquidity
arc dex swap 10 usdc <token-addr> --dex <dex-addr>             # Swap USDC -> Token
arc dex swap 5000 <token-addr> usdc --dex <dex-addr>           # Swap Token -> USDC
arc dex quote 10 usdc <token-addr> --dex <dex-addr>            # Get quote
arc dex pools --dex <dex-addr>                                 # List pools
```

### USYC (Yield-Bearing Token)

```bash
arc usyc info                          # Teller details (oracle, mint price, TVL)
arc usyc rate                          # Current USDC/USYC exchange rate
arc usyc balance [address]             # USYC balance + USDC value
arc usyc preview deposit 1000          # Preview deposit/mint/redeem/withdraw
arc usyc deposit 1000                  # Deposit USDC to receive USYC
arc usyc redeem 500                    # Redeem USYC for USDC
arc usyc withdraw 100                  # Withdraw exact USDC amount
arc usyc entitled 0xAddr...            # Check entitlement permissions
```

### StableFX (Escrow FX Trades)

```bash
arc fx info                            # FxEscrow contract details
arc fx trade 1                         # Trade details (pair, rate, status)
arc fx trades -n 20                    # List recent trades
arc fx breach 42                       # Declare trade as breached
arc fx balances 1 2 3                  # Maker/taker balances for trades
arc fx relayer 0xAddr...               # Check relayer authorization
```

### x402 Protocol

x402 is an HTTP 402 payment protocol that enables AI agents to pay for API access with USDC.

```bash
arc x402 server --port 3000 --price 0.01 --pay-to <your-address>
arc x402 server --routes routes.json    # Custom route pricing
arc x402 test <url>                     # Test an x402 endpoint
arc x402 pay <url>                      # Pay for an x402 resource
arc x402 init --pay-to <your-address>   # Init x402 templates in project
```

### Transaction & Explorer

```bash
arc tx status <hash>          # Transaction status and details
arc tx decode <hash>          # Decode transaction input data
arc tx receipt <hash>         # Full transaction receipt

arc explore tx <hash>         # Open transaction in Arcscan
arc explore address <addr>    # Open address in Arcscan
arc explore contract <addr>   # Open contract in Arcscan
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
| USYCTeller       | `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A` |
| FxEscrow         | `0x867650F5eAe8df91445971f14d89fd84F0C9a9f8` |
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

See [CONTRIBUTING.md](CONTRIBUTING.md) for development conventions and guidelines.

## Testing

The project has 471 tests (369 Vitest + 102 Foundry):

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
- USYC Teller and StableFX ABI validation and command tests
- x402 server and client
- Formatter and validator utilities
- Solidity contract tests (SimpleToken, SimpleNFT, SimpleDEX) with fuzz testing

## CI/CD

GitHub Actions runs on every push and PR:

1. **Lint & Format** - ESLint + Prettier
2. **TypeScript Check** - `tsc --noEmit`
3. **Vitest** - All unit and integration tests
4. **Foundry** - Smart contract tests

A nightly build also runs to verify the full build pipeline.

## Project Structure

```
arcclitools/
├── bin/
│   └── arc-cli.ts              # CLI executable entry point
├── src/
│   ├── index.ts                # Commander setup, command registration
│   ├── commands/               # CLI command definitions (20 commands)
│   ├── services/               # SDK wrappers and business logic
│   │   ├── circle-wallets.ts   # Circle Developer-Controlled Wallets
│   │   ├── circle-contracts.ts # Circle Smart Contract Platform
│   │   ├── bridge.ts           # Circle Bridge Kit (CCTP)
│   │   ├── gateway.ts          # Circle Gateway
│   │   ├── rpc.ts              # viem public/wallet client
│   │   ├── x402-client.ts      # @x402/fetch wrapper
│   │   ├── x402-server.ts      # @x402/express wrapper
│   │   ├── foundry.ts          # Foundry CLI wrapper
│   │   ├── pinata.ts           # Pinata IPFS uploads
│   │   └── deployments.ts      # Deployment tracking (deployments.json)
│   ├── config/
│   │   ├── constants.ts        # Network constants, contract addresses
│   │   ├── store.ts            # Persistent config (~/.config/arc-cli)
│   │   └── env.ts              # Environment variable loading
│   ├── utils/
│   │   ├── validator.ts        # Address, amount, URL validation
│   │   ├── formatter.ts        # Output formatting
│   │   ├── logger.ts           # Colored output + spinners
│   │   ├── prompts.ts          # Interactive prompts
│   │   └── tokens.ts           # Token alias resolution (usdc, eurc, usyc)
│   ├── contracts/              # Solidity contracts and precompiled ABIs
│   └── types/
│       └── index.ts            # Shared TypeScript interfaces
├── test/                       # 369 Vitest tests + 102 Foundry tests
├── templates/                  # x402 server templates
└── arc-docs/                   # Arc Network documentation
```

## License

MIT
