# Arc CLI - Full Demo
Output demo.gif
Output demo.mp4

Set Shell "zsh"
Set FontSize 14
Set Width 1200
Set Height 650
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 30ms

# ── Intro ──
Type "# Arc CLI - Complete CLI for Arc Network (Circle L1)"
Enter
Sleep 1.5s

# ── Network ──
Type "# Check network status, gas price, and chain info"
Enter
Sleep 1s
Type "arc network status"
Enter
Sleep 5s

Type "arc network gas"
Enter
Sleep 5s

# ── Wallet ──
Type "# Check wallet balances (USDC, EURC, USYC)"
Enter
Sleep 1s
Type "arc wallet balance"
Enter
Sleep 5s

# ── Contract Addresses ──
Type "# All known contract addresses on Arc Testnet"
Enter
Sleep 1s
Type "arc addresses list -c stablecoins"
Enter
Sleep 3s

# ── USYC Yield Token ──
Type "# USYC: yield-bearing token backed by US Treasuries"
Enter
Sleep 1s
Type "arc usyc rate"
Enter
Sleep 5s

Type "arc usyc preview deposit 100"
Enter
Sleep 5s

Type "# Check if an address is entitled to use USYC Teller"
Enter
Sleep 1s
Type "arc usyc entitled 0x6508Abe0cFE0290B4b29EBD0F88102F8425d29bB"
Enter
Sleep 6s

# ── StableFX ──
Type "# StableFX: escrow-based FX trades (USDC/EURC)"
Enter
Sleep 1s
Type "arc fx trades -n 3"
Enter
Sleep 8s

Type "arc fx trade 133"
Enter
Sleep 6s

# ── Deploy & DEX ──
Type "# Deploy tokens, NFTs, DEX - all tracked in deployments.json"
Enter
Sleep 1s
Type "arc deploy list"
Enter
Sleep 3s

Type "# DEX: constant product AMM with 0.3% fee"
Enter
Sleep 1s
Type "arc dex quote 1 usdc 0xe64a4e3fa9d0c2541e0b02b5984139f0536f9af9 --dex 0x7fe90383366932233c2b63fb93e12a2ac51242f0"
Enter
Sleep 5s

Type "arc dex pools --dex 0x7fe90383366932233c2b63fb93e12a2ac51242f0"
Enter
Sleep 5s

# ── Send USDC ──
Type "# Send native USDC on Arc (sub-second finality)"
Enter
Sleep 1s
Type "arc send 0.01 0x000000000000000000000000000000000000dEaD"
Enter
Sleep 8s

# ── On-chain Message ──
Type "# Write and read messages on-chain"
Enter
Sleep 1s
Type 'arc message write "gm from arc-cli"'
Enter
Sleep 8s

# ── Transaction ──
Type "# Inspect any transaction"
Enter
Sleep 1s
Type "arc tx status 0xcd436130da5c01d0a2ac21d112fc723759a9e4d48084434604e1cc9cf4fa1fd8"
Enter
Sleep 6s

# ── EVM Info ──
Type "# Arc vs Ethereum EVM differences"
Enter
Sleep 1s
Type "arc info evm"
Enter
Sleep 4s

# ── Docs ──
Type "# Search Arc documentation locally"
Enter
Sleep 1s
Type 'arc docs search "gas" -l 3'
Enter
Sleep 3s

# ── Outro ──
Type "# 20 command groups, 72 commands - github.com/0xbyt4/arcclitools"
Enter
Sleep 3s
