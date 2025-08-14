# Avalanche AI Trader

## Project info

**URL**: <YOUR_PROJECT_URL>

A sophisticated AI-powered trading platform built on Avalanche C-Chain, featuring machine learning price predictions and automated trading through smart contracts.

## How can I edit this code?

You can edit your application in several ways:

**Use your preferred IDE**

Clone this repo and push changes. The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Smart Contract Development

This project includes smart contracts for AI-validated trading on Avalanche. The contracts provide on-chain validation of AI predictions before executing trades.

### Prerequisites

- Node.js 18+ and npm
- Hardhat development environment
- MetaMask or compatible Web3 wallet
- Test AVAX for Fuji testnet

### Environment Setup

1. Copy the environment template:
```sh
cp .env.example .env
```

2. Fill in your environment variables:
```env
# Backend/Deployment variables
PRIVATE_KEY=your_private_key_here
AVALANCHE_RPC_URL=https://avax-mainnet.g.alchemy.com/v2/your_key
FUJI_RPC_URL=https://avax-fuji.g.alchemy.com/v2/your_key
SNOWTRACE_API_KEY=your_snowtrace_api_key
NETWORK=fuji

# Frontend variables (set these after deployment)
VITE_NETWORK=fuji
VITE_AI_POWERED_TRADER_ADDRESS=your_deployed_contract_address
VITE_PRICE_ORACLE_ADDRESS=your_deployed_contract_address
```

### Smart Contract Commands

```sh
# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to Fuji testnet
npm run deploy:fuji

# Deploy to Avalanche mainnet
npm run deploy:avalanche

# Verify contracts on Snowtrace
npm run verify
```

### Contract Architecture

- **PriceOracle.sol**: Stores and validates AI price predictions with confidence thresholds
- **AIPoweredTrader.sol**: Executes trades through Pangolin DEX with mandatory AI validation
- **IPangolinRouter.sol**: Interface for Pangolin DEX router integration

### Key Features

- **AI Validation**: All trades require valid AI predictions with 70%+ confidence
- **Security**: OpenZeppelin security patterns (Ownable, ReentrancyGuard, Pausable)
- **Emergency Controls**: Pause/unpause functionality and emergency withdrawals
- **Multi-Network**: Support for both Fuji testnet and Avalanche mainnet
- **TypeScript Integration**: Full TypeScript support with generated contract types

### Testing

The smart contracts include comprehensive test suites:

```sh
# Run all tests
npm run test

# Run specific test file
npx hardhat test test/PriceOracle.test.ts
npx hardhat test test/AIPoweredTrader.test.ts
```

### Deployment

Contracts are deployed in sequence:
1. PriceOracle (no dependencies)
2. AIPoweredTrader (requires PriceOracle and Pangolin Router addresses)

Deployment addresses are automatically saved to `deployments.json` and contract ABIs are copied to the frontend. After deployment, copy the contract addresses to your `.env` file for the frontend to use.

### Frontend Setup

After deploying the smart contracts:

1. Copy the contract addresses from the deployment output or `deployments.json` to your `.env` file:
```env
VITE_AI_POWERED_TRADER_ADDRESS=0x...
VITE_PRICE_ORACLE_ADDRESS=0x...
```

2. Start the development server:
```sh
npm run dev
```

The frontend will automatically connect to the deployed contracts using the environment variables.

## What technologies are used for this project?

This project is built with:

### Frontend
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Web3.js
- TensorFlow.js (AI models)

### Smart Contracts
- Solidity 0.8.19
- Hardhat
- OpenZeppelin Contracts
- TypeChain
- Ethers.js

### AI/ML
- LSTM Neural Networks
- Q-Learning Algorithms
- Real-time price prediction
- Confidence scoring

### Blockchain
- Avalanche C-Chain
- Pangolin DEX
- MetaMask integration
- Multi-network support

## How can I deploy this project?

You can deploy this project using your preferred hosting provider (e.g., Vercel, Netlify, AWS, etc.).

### Smart Contract Deployment

1. **Testnet Deployment**:
```sh
npm run deploy:fuji
```

2. **Mainnet Deployment**:
```sh
npm run deploy:avalanche
```

3. **Contract Verification**:
```sh
npm run verify
```

## Can I connect a custom domain?

Yes, you can! Follow your hosting provider's instructions to connect a custom domain.

## License

This project is licensed under the MIT License.
