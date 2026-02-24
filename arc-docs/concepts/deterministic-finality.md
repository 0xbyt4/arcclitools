# Deterministic Finality

> Arc's deterministic finality provides instant, irreversible transaction settlement in under one second.

Arc gives you deterministic, sub-second finality for every transaction. Once a
block is committed, any transaction in that block is instantly and irreversibly
final. This removes the uncertainty you may encounter on chains that rely on
probabilistic finality.

## Why deterministic finality matters

On proof-of-work or many proof-of-stake chains, transactions are considered
*final* only after multiple confirmations. Even then, there's a risk of chain
reorganizations that can undo recent blocks and transactions therein.

With Arc:

* A transaction is either unconfirmed or final.
* There's no "probably final" state.
* Once final, the transaction cannot be reversed.

This certainty allows you to build applications that demand high assurance,
especially where financial risk must be minimized and operational standards are
strict.

## Sub-second confirmation

Arc's consensus engine, Malachite, is a high-performance BFT implementation. It
finalizes blocks in less than one second.

This speed means you can:

* Process point-of-sale payments without waiting minutes for confirmation.
* Support cross-border transfers that settle instantly.
* Enable institutional trades and clearing with immediate certainty.

## Developer benefits

Deterministic finality changes how you design financial applications:

* You don't need to build retry or rollback logic for reorgs.
* You can trigger offchain effects immediately after a block is committed.
* You can meet enterprise-grade requirements for settlement assurance.
