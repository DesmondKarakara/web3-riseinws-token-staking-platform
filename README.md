

# Stellar Token Staking dApp

A fully functional staking platform built on Stellar/Soroban, allowing users to connect wallets, stake tokens, earn rewards, claim earnings, and monitor real-time platform data.

## Live Demo
- [Live Vercel](https://web3-riseinws-token-staking-platfor.vercel.app/)
- [Live Render](https://web3-riseinws-token-staking-platform.onrender.com/)

## Repository
- [View Full Project on GitHub](https://github.com/DesmondKarakara/Web3_RiseInWS_Token-Staking-Platform_Day2_-2-)

## Demo Video
- [VIDEO](https://github.com/DesmondKarakara/Web3_RiseInWS_Token-Staking-Platform_Day2_-2-/blob/main/Screen%20Recording%202026-04-28%20202754.7z)

---

## What This Project Does

This project is a complete staking platform where users can:

- Connect wallets using Freighter
- Stake tokens and earn compound rewards
- View real-time metrics such as balance, APY, and earnings
- Claim rewards at any time
- Track transaction history from the Stellar network
- Monitor platform analytics such as total volume and active stakers
- Manage multiple wallets by disconnecting and reconnecting

No complex setup is required. Clone, install, and run.

---

## Key Features

### Staking
- Stake tokens with compound interest
- Unstake partial or full amounts
- Claim rewards
- View staker details including balance, rewards, and timestamps

### Dashboard & Analytics
- Real-time metrics
- APY calculator with live rate updates
- Transaction history from the Stellar network
- Global statistics including active stakers and reward distribution

### Security & Reliability
- Input validation for all user inputs
- Rate limiting to reduce spam
- Contract health monitoring with alerts
- Error handling for wallet, transaction, and contract issues
- Real-time state sync through polling every 10–15 seconds

### User Experience
- Responsive design for mobile, tablet, and desktop
- Loading states and disabled buttons during transactions
- Toast notifications for success and failure
- Animated background with meteor effect
- Dark theme optimized for Web3 UX

---

## Tech Stack

### Frontend
- Next.js 16
- TypeScript
- Tailwind CSS
- Stellar SDK
- Freighter API

### Smart Contract
- Soroban
- Rust
- Testnet deployment, ready for mainnet preparation

### Development & DevOps
- Node.js 18+
- npm
- ESLint
- GitHub

---

## Quick Start

### Prerequisites
- Node.js 18+ — [Download](https://nodejs.org/)
- npm
- Freighter Wallet — [Install Chrome/Firefox extension](https://www.freighter.app/)
- Testnet XLM — [Get free testnet XLM from Stellar Friendbot](https://laboratory.stellar.org/#friendbot)

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/DesmondKarakara/Web3_RiseInWS_Token-Staking-Platform_Day2_-2-
cd Web3_RiseInWS_Token-Staking-Platform_Day2_-2-
````

#### 2. Install dependencies

```bash
# Frontend
cd client
npm install

# Contract (optional for development)
cd ../contract
cargo build
```

#### 3. Set up environment variables

Create `client/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=CA5TD6RXA5ETYQ6UM46XMBAGFMIFGTUFKY6DIQQLOZ56EESSGJM5HQLU
NEXT_PUBLIC_NETWORK=TESTNET
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
```

#### 4. Run the development server

```bash
cd client
npm run dev
```

The application runs at `http://localhost:3001`.

---

## How to Use

### Step 1: Connect Wallet

1. Click **Connect Wallet** in the top-right navbar
2. Approve the connection in Freighter
3. Your XLM balance appears in the dashboard

### Step 2: Stake Tokens

1. Enter the amount to stake
2. Click **Stake**
3. Approve the transaction in Freighter
4. Wait for confirmation
5. The dashboard updates with your new balance

### Step 3: Earn Rewards

1. Rewards accrue automatically in the dashboard
2. Click **Claim Rewards** anytime
3. Rewards are sent to your wallet

### Step 4: Unstake

1. Enter the amount to unstake
2. Click **Unstake**
3. Approve the transaction
4. Tokens return to your wallet

---

## Architecture

### Component Structure

```text
client/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard with tabs
│   └── globals.css         # Global styles
├── components/
│   ├── Navbar.tsx          # Wallet connection
│   ├── Contract.tsx        # Staking interface
│   ├── Dashboard.tsx       # Metrics display
│   ├── Analytics.tsx       # Platform analytics
│   ├── TransactionHistory.tsx
│   └── ui/                 # Reusable UI components
├── hooks/
│   ├── contract.ts         # Contract interaction
│   ├── transactionUtils.ts # Utility functions
│   └── useStakingData.ts   # Data hooks
├── lib/
│   ├── security.ts         # Input validation, rate limiting
│   ├── monitoring.ts       # Health checks, alerts
│   └── utils.ts            # Formatting utilities
└── public/                 # Static assets
```

### Data Flow

```text
User Action
    ↓
React Component
    ↓
Contract Hook (`client/hooks/contract.ts`)
    ↓
Freighter Wallet
    ↓
Stellar Network / Soroban Contract
    ↓
Response → Update State → Re-render UI
```

---

## Testing

### Run Frontend Tests

```bash
cd client
npm test
```

### Run Contract Tests

```bash
cd contract
cargo test
```

### Test Coverage

* Stake functionality
* Unstake functionality
* Claim rewards
* Error handling
* State management
* Balance calculations

---

## Security Features

### Input Validation

* Verify stake amounts are positive
* Check user has sufficient balance
* Validate unstake amounts do not exceed stake
* Sanitize all user inputs

### Rate Limiting

* Prevent spam transactions
* Configurable request limits
* Cool-down periods between actions

### Error Handling

* Wallet connection errors
* Transaction failures
* Contract execution errors
* Network timeouts

### Monitoring

* Contract health checks
* Performance metrics
* Alert system for failures
* Transaction verification

---

## Responsive Design

Works on:

* Mobile: 375px width
* Tablet: 768px width
* Desktop: 1024px+

Built with Tailwind CSS for responsive behavior.

---

## Smart Contract

Deployed contract preview:

![Smart Contract](https://github.com/user-attachments/assets/ff979b22-2b1f-41ea-9c39-58be1e0f489e)

### Contract Address

```text
CA5TD6RXA5ETYQ6UM46XMBAGFMIFGTUFKY6DIQQLOZ56EESSGJM5HQLU
```

---

## Frontend Preview

User interface for interacting with the staking contract:

![Frontend UI](https://github.com/user-attachments/assets/0de469c2-afdf-4b27-a4bb-9802641d8fb5)

---

## Development & Build

### Development Server

```bash
npm run dev
```

Starts at `http://localhost:3001` with hot reload.

### Production Build

```bash
npm run build
```

Creates an optimized production build.

### Type Checking

```bash
npm run type-check
```

Verifies TypeScript types.

### Linting

```bash
npm run lint
```

Checks code quality with ESLint.

---

## Environment Variables

Create `client/.env.local`:

```env
# Contract Configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=CA5TD6RXA5ETYQ6UM46XMBAGFMIFGTUFKY6DIQQLOZ56EESSGJM5HQLU

# Network Configuration
NEXT_PUBLIC_NETWORK=TESTNET
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

# Optional: API Keys
NEXT_PUBLIC_API_KEY=your_api_key_here
```

---

## Deployment

### Deploy to Vercel

```bash
git push origin main
```

Connect the repo to Vercel for automatic deployments.

### Deploy to Netlify

```bash
npm run build
```

Deploy the `client/.next` folder.

### Manual Deployment

```bash
npm run build
```

Deploy the `client/.next/standalone` folder.

---

## Troubleshooting

### Wallet Won't Connect

* Ensure Freighter is installed and enabled
* Confirm you are on Stellar Testnet in Freighter
* Try disconnecting and reconnecting

### Transaction Fails

* Verify you have enough XLM
* Check network connection
* Review the error message in the UI

### No Balance Showing

* Wait 5–10 seconds for network sync
* Refresh the page
* Verify Freighter is connected

### Contract Address Not Found

* Ensure `CONTRACT_ADDRESS` in `client/hooks/contract.ts` is correct
* Verify you are on Testnet, not Public Network
* Check the contract deployment status

---

## Project Status

| Component          | Status        | Notes                      |
| ------------------ | ------------- | -------------------------- |
| Smart Contract     | ✅ Deployed    | Testnet only               |
| Frontend UI        | ✅ Complete    | Mobile responsive          |
| Wallet Integration | ✅ Complete    | Freighter only             |
| Staking Functions  | ✅ Working     | All core functions         |
| Error Handling     | ✅ Complete    | 3+ error types             |
| Real-time Updates  | ✅ Working     | 10–15s polling             |
| Security Features  | ✅ Implemented | Validation + rate limiting |
| Tests              | ✅ Passing     | 9+ contract tests          |
| Documentation      | ✅ Complete    | README + guides            |

---

## License

This project is open source and available under the MIT License.

---

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

## Author

Developed by **RiseIn**, **GDG Nit**, and **Devdipro Bhaduri**

---

## Acknowledgments

* Stellar Community
* RiseIn Workshop Team
* Contributors and testers

```
