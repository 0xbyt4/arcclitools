# Deploy on Arc

> Learn how to deploy, test, and interact with a Solidity smart contract on the Arc Testnet.

> Arc is currently in its testnet phase. During this period, the network may
> experience instability or unplanned downtime.

In this tutorial, you'll use Solidity and Foundry to write, deploy, and interact
with a simple smart contract on the Arc Testnet.

## What you'll learn

* Set up your development environment
* Configure Foundry to connect with Arc
* Implement your smart contract
* Deploy your contract to Arc Testnet
* Interact with your deployed contract

## Set up your development environment

1. Install Development Tools

```shell
curl -L https://foundry.paradigm.xyz | bash
```

2. Install binaries

```shell
foundryup
```

3. Initialize a new Solidity Project

```shell
forge init hello-arc && cd hello-arc
```

## Configure Foundry to interact with Arc

1. Create a `.env` file in the root of the project directory.

2. Add the Arc Testnet RPC URL:

```ini
ARC_TESTNET_RPC_URL="https://rpc.testnet.arc.network"
```

> Never commit your `.env` file to version control.

## Implement your smart contract

### 1. Write the HelloArchitect contract

Delete the default template and create `src/HelloArchitect.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract HelloArchitect {
    string private greeting;

    event GreetingChanged(string newGreeting);

    constructor() {
        greeting = "Hello Architect!";
    }

    function setGreeting(string memory newGreeting) public {
        greeting = newGreeting;
        emit GreetingChanged(newGreeting);
    }

    function getGreeting() public view returns (string memory) {
        return greeting;
    }
}
```

### 2. Update scripts and tests

Delete the `script` directory:

```shell
rm -rf script
```

Replace `Counter.t.sol` with `test/HelloArchitect.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import "../src/HelloArchitect.sol";

contract HelloArchitectTest is Test {
    HelloArchitect helloArchitect;

    function setUp() public {
        helloArchitect = new HelloArchitect();
    }

    function testInitialGreeting() public view {
        string memory expected = "Hello Architect!";
        string memory actual = helloArchitect.getGreeting();
        assertEq(actual, expected);
    }

    function testSetGreeting() public {
        string memory newGreeting = "Welcome to Arc Chain!";
        helloArchitect.setGreeting(newGreeting);
        string memory actual = helloArchitect.getGreeting();
        assertEq(actual, newGreeting);
    }

    function testGreetingChangedEvent() public {
        string memory newGreeting = "Building on Arc!";

        vm.expectEmit(true, true, true, true);
        emit HelloArchitect.GreetingChanged(newGreeting);

        helloArchitect.setGreeting(newGreeting);
    }
}
```

### 3. Test the contract

```shell
forge test
```

### 4. Compile the contract

```shell
forge build
```

## Deploy your contract to Arc Testnet

### 1. Generate a wallet

```shell
cast wallet new
```

Add your private key to `.env`:

```ini
PRIVATE_KEY="0x..."
```

Reload environment variables:

```shell
source .env
```

### 2. Fund your wallet

Visit [https://faucet.circle.com](https://faucet.circle.com), select **Arc Testnet**,
paste your wallet address, and request testnet USDC.

### 3. Deploy the contract

```shell
forge create src/HelloArchitect.sol:HelloArchitect \
  --rpc-url $ARC_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### 4. Store the contract address

Save the deployed contract address to `.env`:

```ini
HELLOARCHITECT_ADDRESS="0x..."
```

```shell
source .env
```

## Interact with your deployed contract

### 1. Check transaction on the explorer

Open the [Arc Testnet Explorer](https://testnet.arcscan.app) and paste the
transaction hash.

### 2. Use `cast` to call a contract function

```shell
cast call $HELLOARCHITECT_ADDRESS "getGreeting()(string)" \
  --rpc-url $ARC_TESTNET_RPC_URL
```

## Next steps

* Extend the **HelloArchitect** contract with more logic
* Explore Arc's stablecoin-native features like USDC as gas and deterministic finality
* Build more advanced applications for payments, FX, or tokenized assets
