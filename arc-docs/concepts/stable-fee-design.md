# Stable Fee Design

> Arc's USDC-based fee model provides predictable, stable transaction costs for developers and users.

Arc implements a USDC-based fee model designed around three core principles:
predictability, stability, and simplicity.

## Key characteristics

### Predictable pricing
Arc targets approximately one cent per transaction, implementing what they call
the *"1 cent, 1 second, 1 click"* philosophy. This contrasts with traditional
blockchains where gas costs fluctuate based on volatile token prices.

### Stablecoin foundation
Rather than volatile cryptocurrencies, Arc uses USDC as its native gas token.
This approach allows developers to estimate costs in dollar terms and simplifies
accounting since the transfer unit and payment unit are identical.

### Smoothed fee adjustments
The platform employs an exponentially weighted moving average mechanism — borrowed
from Ethereum's EIP-1559 but modified — that prevents abrupt fee spikes from
short-term demand surges.

## Developer advantages

The system offers several practical benefits:

* Fees remain stable despite network congestion
* Dollar-denominated costs enable straightforward budgeting
* Reduced complexity for enterprise and fintech integrations
* Foundation for flexible fee sponsorship models

## Future expansion

Arc's roadmap includes support for additional stablecoins (EURC, USDT, MXNB) and
programmable fee mechanisms allowing custom discounts or subsidies. These features
would enable gasless experiences and multi-currency applications.

For technical specifications, see the [Gas and Fees](/arc/references/gas-and-fees)
reference.
