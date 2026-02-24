import type { ArcNetwork, EvmDifference, ProviderInfo } from "../types/index.js";

export const ARC_TESTNET: ArcNetwork = {
  name: "Arc Testnet",
  chainId: 5042002,
  rpcUrl: "https://rpc.testnet.arc.network",
  wsUrl: "wss://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  faucet: "https://faucet.circle.com",
  cctpDomain: 26,
  contracts: {
    USDC: {
      address: "0x3600000000000000000000000000000000000000",
      description: "Optional ERC-20 interface for native USDC balance (6 decimals)",
      decimals: 6,
    },
    EURC: {
      address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      description: "Euro-denominated stablecoin (6 decimals)",
      decimals: 6,
    },
    USYC: {
      address: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C",
      description: "Yield-bearing token backed by US Treasury securities (6 decimals)",
      decimals: 6,
    },
    USYCEntitlements: {
      address: "0xcc205224862c7641930c87679e98999d23c26113",
      description: "USYC allowlist and entitlement controls",
    },
    USYCTeller: {
      address: "0x9fdF14c5B14173D74C08Af27AebFf39240dC105A",
      description: "Mint/redeem testnet USYC from testnet USDC",
    },
    TokenMessengerV2: {
      address: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
      description: "CCTP TokenMessengerV2 (domain 26)",
    },
    MessageTransmitterV2: {
      address: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
      description: "CCTP MessageTransmitterV2 (domain 26)",
    },
    TokenMinterV2: {
      address: "0xb43db544E2c27092c107639Ad201b3dEfAbcF192",
      description: "CCTP TokenMinterV2 (domain 26)",
    },
    MessageV2: {
      address: "0xbaC0179bB358A8936169a63408C8481D582390C4",
      description: "CCTP MessageV2 (domain 26)",
    },
    GatewayWallet: {
      address: "0x0077777d7EBA4688BDeF3E311b846F25870A19B9",
      description: "Gateway unified wallet (domain 26)",
    },
    GatewayMinter: {
      address: "0x0022222ABE238Cc2C7Bb1f21003F0a260052475B",
      description: "Gateway minter (domain 26)",
    },
    FxEscrow: {
      address: "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8",
      description: "StableFX escrow for stablecoin swaps",
    },
    Multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      description: "Aggregates multiple read calls into a single call",
    },
    Permit2: {
      address: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
      description: "Universal signature-based token approvals (required for StableFX)",
    },
    CREATE2Factory: {
      address: "0x4e59b44847b379578588920cA78FbF26c0B4956C",
      description: "Deterministic contract deployment using CREATE2 opcode",
    },
  },
};

export const ALTERNATIVE_RPCS = [
  "https://rpc.blockdaemon.testnet.arc.network",
  "https://rpc.drpc.testnet.arc.network",
  "https://rpc.quicknode.testnet.arc.network",
];

export const ALTERNATIVE_WS = [
  "wss://rpc.drpc.testnet.arc.network",
  "wss://rpc.quicknode.testnet.arc.network",
];

export const NATIVE_USDC_DECIMALS = 18;
export const ERC20_USDC_DECIMALS = 6;
export const MIN_BASE_FEE_GWEI = 160;

export const ARC_BLOCKCHAIN_ID = "ARC-TESTNET";

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
] as const;

export const EVM_DIFFERENCES: EvmDifference[] = [
  {
    area: "Native token",
    ethereum: "ETH, volatile pricing",
    arc: "USDC, stable pricing with 18 decimals; used as gas",
  },
  {
    area: "Fee market",
    ethereum: "EIP-1559 base fee per block",
    arc: "Fee smoothing with moving average; stable, bounded base fee",
  },
  {
    area: "Finality",
    ethereum: "Probabilistic (~12-15 min for safety)",
    arc: "Deterministic and instant (<1s)",
  },
  {
    area: "Consensus",
    ethereum: "Proof-of-Stake (slot/epoch model)",
    arc: "Malachite (Tendermint-based) BFT with permissioned validators",
  },
  {
    area: "Block timestamps",
    ethereum: "Derived from slots and epochs",
    arc: "Wall-clock time; sub-second blocks may share timestamps",
  },
  {
    area: "SELFDESTRUCT",
    ethereum: "Allowed with value transfers to self",
    arc: "Not allowed during deployment to prevent burning native tokens",
  },
  {
    area: "PARENT_BEACON_BLOCK_ROOT",
    ethereum: "Root of parent beacon block (SSZ)",
    arc: "Hash of parent execution payload header (keccak256(RLP(header)))",
  },
  {
    area: "PREV_RANDAO",
    ethereum: "Randomness mix of proposer reveals",
    arc: "Always 0; not used for randomness",
  },
  {
    area: "USDC blocklist",
    ethereum: "Runtime revert on transfer",
    arc: "Pre-block inclusion check when possible; reverts or blocks",
  },
  {
    area: "EIP-4844 blobs",
    ethereum: "Supported post-Dencun",
    arc: "Currently disabled",
  },
];

export const PROVIDERS: ProviderInfo[] = [
  // Node providers
  { name: "Alchemy", url: "https://www.alchemy.com/arc", description: "Scalable EVM access with enhanced APIs, monitoring, and debugging", category: "node" },
  { name: "Blockdaemon", url: "https://www.blockdaemon.com/protocols/arc", description: "Institutional-grade secure and compliant infrastructure", category: "node" },
  { name: "dRPC", url: "https://drpc.org/chainlist/arc-testnet-rpc", description: "Decentralized RPC aggregator with load-balanced access", category: "node" },
  { name: "QuickNode", url: "https://www.quicknode.com/chains/arc", description: "High-performance global endpoints and APIs", category: "node" },
  // Data indexers
  { name: "Envio", url: "https://envio.dev", description: "Event-driven indexing with HyperIndex for production APIs", category: "indexer" },
  { name: "Goldsky", url: "https://goldsky.com", description: "Managed subgraph and data pipelines with sub-second latency", category: "indexer" },
  { name: "The Graph", url: "https://thegraph.com", description: "Decentralized indexing protocol with subgraphs", category: "indexer" },
  { name: "Thirdweb", url: "https://thirdweb.com", description: "Open-source blockchain data tooling with Insight", category: "indexer" },
  // Account Abstraction
  { name: "Biconomy", url: "https://www.biconomy.io", description: "Modular smart accounts, paymasters, and bundlers", category: "aa" },
  { name: "Circle Wallets", url: "https://developers.circle.com/wallets", description: "End-to-end platform for Arc wallet management", category: "aa" },
  { name: "Pimlico", url: "https://pimlico.io", description: "Bundler and paymaster infrastructure for ERC-4337", category: "aa" },
  { name: "Privy", url: "https://www.privy.io", description: "Embedded wallets and user authentication", category: "aa" },
  { name: "Zerodev", url: "https://zerodev.app", description: "ERC-4337 smart accounts with session keys and bundlers", category: "aa" },
  // Compliance
  { name: "Elliptic", url: "https://www.elliptic.co", description: "Blockchain analytics, AML and sanctions compliance", category: "compliance" },
  { name: "TRM Labs", url: "https://www.trmlabs.com", description: "Risk intelligence, wallet screening, and fraud detection", category: "compliance" },
  // Explorer
  { name: "Blockscout", url: "https://testnet.arcscan.app", description: "Open-source explorer with contract verification and APIs", category: "explorer" },
];

export const CONFIG_KEYS = ["apiKey", "entitySecret", "rpcUrl", "network", "privateKey", "x402Port", "x402Price", "pinataJwt"] as const;
