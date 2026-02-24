# Opt-in Privacy

> Arc's opt-in privacy enables confidential onchain transactions with selective disclosure and compliance-ready auditability.

Arc provides opt-in privacy to enable confidential financial workflows while
preserving auditability. As a developer, you can design applications that keep
sensitive data private while still meeting compliance requirements.

> Note: Privacy features are on the roadmap and not yet available on Arc.

## Why privacy matters

Most blockchains are fully transparent. This creates problems for financial use
cases:

* **Commercial sensitivity**. Corporate treasuries, payroll, and trade finance
  cannot expose amounts publicly.
* **User protection**. Salary payments, vendor invoices, and B2B transfers may
  contain information that should not be visible to competitors or the public.
* **Compliance**. Institutions must protect customer data while also meeting
  regulatory obligations for audit and monitoring.

Arc addresses these needs with an opt-in privacy model.

## Confidential transfers

The first phase of Arc's privacy roadmap introduces confidential transfers:

1. Transaction amounts are encrypted and not visible on the public ledger.
2. Sender and receiver addresses remain visible for compatibility with analytics
   and monitoring tools.
3. Transactions still finalize onchain with the same deterministic guarantees as
   public transfers.

For developers, this means you can shield amounts without losing transparency
into participants or transaction flow.

## Selective disclosure with view keys

Arc supports view keys, which let you grant controlled read access to
confidential data:

* **Auditors and regulators** can review transaction details when required.
* **Institutions** can always monitor their own customer transactions.
* **Developers** can build apps that balance privacy and transparency by design.

This ensures you can meet regulatory obligations such as the Travel Rule while
still protecting sensitive business logic.

## Modular privacy architecture

Arc's privacy system is modular, starting with Trusted Execution Environments
(TEEs) for performance and maturity. The architecture is designed to support
additional cryptographic backends over time, including:

* **Multi-Party Computation (MPC)**. Splits secrets across multiple parties so
  no single entity can reconstruct sensitive data, increasing trust in
  collaborative workflows.
* **Fully Homomorphic Encryption (FHE)**. Lets computations run directly on
  encrypted data, ensuring privacy is preserved even during processing.
* **Zero-knowledge proofs (ZK)**. Allow one party to prove that a statement is
  true without revealing underlying data, enabling efficient compliance and
  verification.

This flexibility ensures Arc can evolve as new privacy technologies become
production-ready.

## Developer implications

With compliant privacy, you can:

* Build applications that handle sensitive financial data without exposing
  amounts onchain.
* Provide auditability and compliance by granting view keys to trusted parties.
* Plan for a future-proof privacy stack that evolves with advanced cryptography.

Arc's privacy model balances the needs of institutions, regulators, and
developers, enabling real-world financial activity onchain.
