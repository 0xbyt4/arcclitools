# Contributing to arc-cli

Thank you for your interest in contributing to arc-cli. This guide covers everything you need to get started.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Foundry** (for smart contract tests) - [Install guide](https://book.getfoundry.sh/getting-started/installation)

## Setup

```bash
git clone https://github.com/0xbyt4/arcclitools.git
cd arcclitools
npm install

# Copy environment template
cp .env.example .env

# Verify setup
npm run typecheck
npm test
```

## Development Workflow

### Running in dev mode

```bash
# Run any command with tsx (no build needed)
npx tsx bin/arc-cli.ts --help
npx tsx bin/arc-cli.ts network status

# Or use the npm script
npm run dev -- network status
```

### Building

```bash
npm run build

# Test the built version
node dist/bin/arc-cli.js --version
```

### Code Quality

All checks must pass before submitting a PR. CI runs these automatically.

```bash
# TypeScript type checking (strict mode)
npm run typecheck

# ESLint
npm run lint
npm run lint:fix

# Prettier (double quotes, 100 char width, trailing commas)
npm run format:check
npm run format
```

### Prettier Config

| Rule | Value |
|------|-------|
| Semi | `true` |
| Quotes | `double` |
| Tab Width | `2` |
| Print Width | `100` |
| Trailing Comma | `es5` |
| Arrow Parens | `always` |

### ESLint Rules

- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: error (prefix unused with `_`)
- `no-console`: off (CLI tool, console output is expected)

## Testing

### Vitest (TypeScript tests)

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run a specific test file
npx vitest run test/rpc.test.ts
```

### Foundry (Solidity contract tests)

```bash
# Run all Foundry tests
forge test

# Verbose output
forge test -vvv

# Run a specific test contract
forge test --match-contract SimpleTokenTest
```

Current counts: **332 Vitest + 102 Foundry = 434 tests**.

### Writing Tests

- Place Vitest tests in `test/` with `.test.ts` extension
- Place Foundry tests in `test/foundry/` with `.t.sol` extension
- Mock external services (Circle SDK, RPC calls) - don't make real network calls in tests
- Test both success and error paths

For the full command reference with all options, see [COMMANDS.md](COMMANDS.md).

## Project Structure

```
src/
├── index.ts              # Commander setup, command registration
├── commands/             # CLI command definitions (one file per command group)
├── services/             # SDK wrappers and business logic
│   ├── circle-wallets.ts # Circle Developer-Controlled Wallets
│   ├── circle-contracts.ts # Circle Smart Contract Platform
│   ├── bridge.ts         # Circle Bridge Kit (CCTP)
│   ├── gateway.ts        # Circle Gateway
│   ├── rpc.ts            # viem public/wallet client
│   ├── x402-client.ts    # @x402/fetch wrapper
│   ├── x402-server.ts    # @x402/express wrapper
│   ├── foundry.ts        # Foundry CLI wrapper (execFileSync)
│   ├── pinata.ts         # Pinata IPFS uploads
│   └── deployments.ts    # Deployment tracking (deployments.json)
├── config/
│   ├── constants.ts      # Network constants, contract addresses, EVM diffs
│   ├── store.ts          # Persistent config (~/.config/arc-cli/arcrc.json)
│   └── env.ts            # Environment variable loading + validation
├── utils/
│   ├── validator.ts      # Input validation (addresses, amounts, URLs)
│   ├── formatter.ts      # Output formatting (USDC display, tables)
│   ├── logger.ts         # Chalk colored output + Ora spinners
│   ├── prompts.ts        # Inquirer interactive prompts
│   └── tokens.ts         # Token alias resolution (usdc, eurc, usyc)
├── contracts/            # Solidity source + precompiled JSON artifacts
└── types/
    └── index.ts          # Shared TypeScript interfaces
```

### Adding a New Command

1. Create `src/commands/mycommand.ts` with a `registerMyCommand(program: Command)` function
2. Register it in `src/index.ts`:
   ```typescript
   import { registerMyCommand } from "./commands/mycommand.js";
   // ...
   registerMyCommand(program);
   ```
3. Follow existing patterns: use `spinner()` for async ops, `log.error()` for errors, set `process.exitCode = 1` on failure (never call `process.exit()`)
4. Add tests in `test/`

### Adding a New Service

1. Create `src/services/myservice.ts`
2. Handle errors with try/catch and throw descriptive `Error` messages
3. Keep SDK/API logic here, not in commands
4. Add tests with mocked dependencies

## Conventions

### TypeScript

- **Strict mode** enabled (`strict: true` in tsconfig.json)
- Target: ES2022, Module: Node16
- Always use `.js` extension in imports (ESM requirement)
- Avoid `any` - use proper types or `unknown` with type guards

### CLI Patterns

- Use `process.exitCode = 1` instead of `process.exit(1)`
- Use `spinner()` from logger.ts for async operations
- Use `log.error()`, `log.success()`, `log.warn()` for user-facing messages
- Use `table()` from logger.ts for tabular output
- Use `promptText()`, `promptSelect()`, `promptAddress()` for interactive input
- Validate all user input with functions from `validator.ts`

### Shell Execution

- Use `execFileSync` with array arguments (never string interpolation with `execSync`)
- Wrap in try/catch, throw `Error` with stderr content

### Security

- Never commit `.env` files or secrets
- Private keys written to `.env` must use file mode `0o600`
- Use `execFileSync` (not `execSync`) to prevent shell injection
- Validate all addresses and amounts before use

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new wallet export command
fix: resolve gateway walletAddress bug
test: expand Foundry tests with edge cases
docs: update README with accurate CLI usage
refactor: consolidate artifact loading functions
chore: update dependencies
```

## Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```
2. Make your changes following the conventions above
3. Ensure all checks pass:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm test
   forge test
   ```
4. Push and create a PR against `main`
5. PR title should follow conventional commit format

### CI Pipeline

Every push and PR runs:

| Job | Command | What it checks |
|-----|---------|---------------|
| Lint & Format | `npm run lint` + `npm run format:check` | ESLint + Prettier |
| TypeScript | `npm run typecheck` | Type errors |
| Vitest | `npm test` | Unit/integration tests |
| Foundry | `forge test -vvv` | Solidity contract tests |

A nightly build also runs to verify the full build pipeline (`npm run build` + runtime check).

## Environment Variables

See `.env.example` for all available variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `CIRCLE_API_KEY` | For Circle SDK commands | Circle API key |
| `CIRCLE_ENTITY_SECRET` | For Circle SDK commands | Circle entity secret |
| `PRIVATE_KEY` | For send/deploy/dex | Wallet private key |
| `ARC_RPC_URL` | No (has default) | Custom RPC endpoint |
| `PINATA_JWT` | For IPFS uploads | Pinata API JWT |
| `X402_PORT` | No (default: 3000) | x402 server port |
| `X402_PRICE` | No (default: 0.01) | x402 price per request |

These can also be set via `arc config set <key> <value>` for persistent storage.
