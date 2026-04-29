
## 📌 What This Project Does

This is a **fully functional staking platform** where users can:

- 🔐 **Connect wallets** using Freighter
- 💰 **Stake tokens** and earn compound rewards
- 📊 **View real-time metrics** (balance, APY, earnings)
- 🎯 **Claim rewards** anytime
- 💳 **Track transaction history** from Stellar network
- 📈 **Monitor platform analytics** (total volume, active stakers)
- 🔄 **Manage multiple wallets** (disconnect/reconnect)

No complex setup required—just clone, install, and go!

---

## ✨ Key Features

### Staking Functions
- ✅ **Stake tokens** with compound interest
- ✅ **Unstake** partial or full amounts
- ✅ **Claim rewards** automatically
- ✅ **View staker info** (balance, rewards, timestamps)

### Dashboard & Analytics
- ✅ **Real-time metrics** (total volume, average stake, rewards)
- ✅ **APY calculator** with live rate updates
- ✅ **Transaction history** from Stellar network
- ✅ **Global statistics** (active stakers, reward distribution)

### Security & Reliability
- ✅ **Input validation** for all user inputs
- ✅ **Rate limiting** to prevent spam
- ✅ **Contract health monitoring** with alerts
- ✅ **Error handling** (wallet, transaction, contract errors)
- ✅ **Real-time state sync** via polling (10-15s intervals)

### User Experience
- ✅ **Responsive design** (mobile, tablet, desktop)
- ✅ **Loading states** and disabled buttons during transactions
- ✅ **Toast notifications** for success/failure
- ✅ **Animated background** with meteor effect
- ✅ **Dark theme** optimized for Web3 UX

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (React framework with SSR)
- **TypeScript** (strict mode for safety)
- **Tailwind CSS** (responsive design)
- **Stellar SDK** (blockchain interaction)
- **Freighter API** (wallet integration)

### Smart Contract
- **Soroban** (Stellar's smart contract platform)
- **Rust** (contract implementation)
- **Testnet Deployment** (ready for mainnet)

### Development & DevOps
- **Node.js 18+**
- **npm** (package management)
- **ESLint** (code quality)
- **GitHub** (version control)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Freighter Wallet** - [Install Chrome/Firefox extension](https://www.freighter.app/)
- **Testnet XLM** - Get free testnet XLM from [Stellar Friendbot](https://laboratory.stellar.org/#friendbot)

### Installation

**1. Clone the repository:**
```bash
git clone https://github.com/DesmondKarakara/Web3_RiseInWS_Token-Staking-Platform_Day2_-2-
cd Web3_RiseInWS_Token-Staking-Platform_Day2_-2-
```

**2. Install dependencies:**
```bash
# Frontend
cd client
npm install

# Contract (optional - for development)
cd ../contract
cargo build
```

**3. Set up environment variables:**
```bash
# In client/.env.local
NEXT_PUBLIC_CONTRACT_ADDRESS=CA5TD6RXA5ETYQ6UM46XMBAGFMIFGTUFKY6DIQQLOZ56EESSGJM5HQLU
NEXT_PUBLIC_NETWORK=TESTNET
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
```

**4. Run the development server:**
```bash
cd client
npm run dev
```

The application will start at **http://localhost:3001**

---

## 📖 How to Use

### Step 1: Connect Wallet
1. Click **"Connect Wallet"** in the top-right navbar
2. Approve the connection in Freighter
3. You should see your XLM balance displayed

### Step 2: Stake Tokens
1. Enter the amount you want to stake
2. Click **"Stake"**
3. Approve the transaction in Freighter
4. Wait for confirmation (~10 seconds)
5. See your balance update in the dashboard

### Step 3: Earn Rewards
1. Rewards accrue automatically (visible in Dashboard)
2. Click **"Claim Rewards"** anytime
3. Rewards are transferred to your wallet

### Step 4: Unstake
1. Enter the amount to unstake
2. Click **"Unstake"**
3. Approve the transaction
4. Tokens return to your wallet

---
## 🎥 Demo Video

[VIDEO](https://github.com/DesmondKarakara/Web3_RiseInWS_Token-Staking-Platform_Day2_-2-/blob/main/Screen%20Recording%202026-04-28%20202754.7z)

---

## 📊 Architecture

### Component Structure
```
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
```
User Action
    ↓
React Component
    ↓
Contract Hook (client/hooks/contract.ts)
    ↓
Freighter Wallet
    ↓
Stellar Network / Soroban Contract
    ↓
Response → Update State → Re-render UI
```

---

## 🧪 Testing

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
- ✅ Stake functionality
- ✅ Unstake functionality
- ✅ Claim rewards
- ✅ Error handling
- ✅ State management
- ✅ Balance calculations


---

## 🔐 Security Features

### Input Validation
- ✅ Verify stake amounts are positive
- ✅ Check user has sufficient balance
- ✅ Validate unstake amounts don't exceed stake
- ✅ Sanitize all user inputs

### Rate Limiting
- ✅ Prevent spam transactions
- ✅ Configurable request limits
- ✅ Cool-down periods between actions

### Error Handling
- ✅ Wallet connection errors
- ✅ Transaction failures
- ✅ Contract execution errors
- ✅ Network timeouts

### Monitoring
- ✅ Contract health checks
- ✅ Performance metrics
- ✅ Alert system for failures
- ✅ Transaction verification

---

## 📱 Responsive Design

Works perfectly on:
- 📱 **Mobile** (375px width)
- 📱 **Tablet** (768px width)
- 💻 **Desktop** (1024px+ width)

Built with Tailwind CSS for optimal responsiveness.

---


## 📜 Smart Contract

Below is the deployed contract preview:

![Smart Contract](https://github.com/user-attachments/assets/ff979b22-2b1f-41ea-9c39-58be1e0f489e)

---

## 🪪 Wallet Details

**Contract Address:**

```
CA5TD6RXA5ETYQ6UM46XMBAGFMIFGTUFKY6DIQQLOZ56EESSGJM5HQLU
```

---
## 💻 Frontend Preview

User interface for interacting with the staking contract:

![Frontend UI](https://github.com/user-attachments/assets/0de469c2-afdf-4b27-a4bb-9802641d8fb5)

---

## 🔗 Repository Link

👉 [View Full Project on GitHub](https://github.com/DesmondKarakara/Web3_RiseInWS_Token-Staking-Platform_Day2_-2-)

|👉 [Live](https://web3-riseinws-token-staking-platform.onrender.com/)
---


## 🚀 Stellar Token Staking dApp 
```bash
https://web3-riseinws-token-staking-platform.onrender.com/
 ```

## 🐛 Troubleshooting

### Wallet Won't Connect
- ✅ Ensure Freighter is installed and enabled
- ✅ Check you're on Stellar Testnet in Freighter
- ✅ Try disconnecting and reconnecting

### Transaction Fails
- ✅ Verify you have enough XLM balance
- ✅ Check network connection
- ✅ Review error message in UI

### No Balance Showing
- ✅ Wait 5-10 seconds for network sync
- ✅ Try refreshing the page
- ✅ Verify Freighter is connected

### Contract Address Not Found
- ✅ Ensure CONTRACT_ADDRESS in `client/hooks/contract.ts` is correct
- ✅ Verify you're on Testnet (not public network)
- ✅ Check contract deployment status

---


## 🔧 Development & Build

### Development Server
```bash
npm run dev
```
Starts at http://localhost:3001 with hot reload

### Production Build
```bash
npm run build
```
Optimized build for deployment

### Type Checking
```bash
npm run type-check
```
Verify TypeScript types

### Linting
```bash
npm run lint
```
Check code quality with ESLint

---

## 📝 Environment Variables

Create `.env.local` in `client/` directory:

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

## 🚀 Deployment

### Deploy to Vercel (Recommended)
```bash
# Push to GitHub first
git push origin main

# Connect repo to Vercel
# Auto-deploys on every push
```

### Deploy to Netlify
```bash
npm run build
# Drag `client/.next` folder to Netlify
```

### Manual Deployment
```bash
npm run build
# Deploy `client/.next/standalone` folder
```

---

## 🐛 Troubleshooting

### Wallet Won't Connect
- ✅ Ensure Freighter is installed and enabled
- ✅ Check you're on Stellar Testnet in Freighter
- ✅ Try disconnecting and reconnecting

### Transaction Fails
- ✅ Verify you have enough XLM balance
- ✅ Check network connection
- ✅ Review error message in UI

### No Balance Showing
- ✅ Wait 5-10 seconds for network sync
- ✅ Try refreshing the page
- ✅ Verify Freighter is connected

### Contract Address Not Found
- ✅ Ensure CONTRACT_ADDRESS in `client/hooks/contract.ts` is correct
- ✅ Verify you're on Testnet (not public network)
- ✅ Check contract deployment status

---


## 📊 Project Status

| Component | Status | Notes |
|-----------|--------|-------|
| Smart Contract | ✅ Deployed | Testnet only |
| Frontend UI | ✅ Complete | Mobile responsive |
| Wallet Integration | ✅ Complete | Freighter only |
| Staking Functions | ✅ Working | All core functions |
| Error Handling | ✅ Complete | 3+ error types |
| Real-time Updates | ✅ Working | 10-15s polling |
| Security Features | ✅ Implemented | Validation + Rate limiting |
| Tests | ✅ Passing | 9+ contract tests |
| Documentation | ✅ Complete | README + guides |
 

---

## 📜 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ✨ Author

Developed by **RiseIn** **GDG Nit** & **Devdipro Bhaduri**

---

## 🙏 Acknowledgments

- Stellar Community
- RiseIn Workshop Team
- Contributors and testers

---

