# Gas and Fees

> Arc's USDC-based gas fee model with predictable, stable transaction costs.

Arc implements USDC as its native gas token to maintain predictable transaction
costs. The testnet enforces a minimum base fee of 160 Gwei, targeting roughly
$0.01 per transaction.

## Key technical details

The network uses EIP-1559-style pricing with dynamic adjustment mechanisms.
Transactions require `maxFeePerGas >= 160 Gwei` for timely inclusion, as
submissions below this threshold risk pending status or execution failure.

The base fee employs a bounded, moving-average mechanism designed to stabilize
around 160 Gwei under normal network load, ensuring fee stability without
extreme volatility.

## Monitoring and best practices

Developers should surface gas fees in USDC and fetch the base fee dynamically
when submitting transactions for optimal user experience. Real-time metrics are
available via the Arc Gas Tracker at https://testnet.arcscan.app/gas-tracker.

> This implementation remains specific to Arc Testnet and may change during
> mainnet preparation.
