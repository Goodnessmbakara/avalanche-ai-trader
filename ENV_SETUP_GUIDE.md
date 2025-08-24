# Environment Setup Guide

## Quick Start

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure essential variables:**
   - `PRIVATE_KEY`: Your deployment wallet private key
   - `VITE_USDT_ADDRESS_FUJI`: USDT token address for Fuji testnet
   - `SNOWTRACE_API_KEY`: For contract verification

3. **Optional API keys (for enhanced features):**
   - `BINANCE_API_KEY` & `BINANCE_SECRET_KEY`: Enhanced trading data
   - `COINGECKO_API_KEY`: Price data and market information
   - `OPENAI_API_KEY`: AI model integration

## Network Configuration

### Fuji Testnet (Development)
- Set `VITE_NETWORK=fuji`
- Use `FUJI_RPC_URL` for blockchain interactions
- Deploy contracts to Fuji first

### Avalanche Mainnet (Production)
- Set `VITE_NETWORK=avalanche`
- Use `AVALANCHE_RPC_URL` for blockchain interactions
- Ensure sufficient AVAX for gas fees

## Security Notes

- Never commit `.env` files to version control
- Use dedicated deployment wallets
- Consider encrypted API keys for production
- The system auto-generates encryption keys if not provided

## Contract Deployment

After deploying contracts, update:
- `VITE_AI_POWERED_TRADER_ADDRESS`
- `VITE_PRICE_ORACLE_ADDRESS`

## Testing

Run tests with:
```bash
npm run test
npm run test:fork  # With mainnet forking
```
