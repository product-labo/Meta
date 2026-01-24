# Multi-Chain Smart Contract Analytics Platform

## 🎯 Purpose
Analyze smart contracts across Ethereum, Starknet, and Lisk to provide:
- **20 DeFi Metrics** (TVL, user growth, gas efficiency)
- **20 User Behavior Patterns** (whale detection, bot analysis)
- **Competitive Intelligence** (market share, gap analysis)

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Your Contract
Edit `.env` file:
```env
CONTRACT_ADDRESS=0xYourContractAddress
CONTRACT_CHAIN=lisk
CONTRACT_NAME=YourContractName
ANALYSIS_BLOCK_RANGE=1000  # Number of recent blocks to analyze
```

### 3. Run Analysis
```bash
# Quick analysis of your contract
npm run quick-start

# Full analysis with competitors
npm run analyze:comparative

# Start API server
npm start
```

## 📊 Available Commands

```bash
npm run quick-start          # Quick contract analysis
npm run analyze              # Analyze target contract
npm run analyze:competitors  # Analyze all competitors
npm run analyze:comparative  # Full comparative analysis
npm run reports list         # List all generated reports
npm run reports show <name>  # Show reports for specific contract
npm start                    # Start API server (port 5000)
```

## 📁 Project Structure
```
├── src/
│   ├── services/           # Analytics services
│   ├── index.js           # Main analytics engine
│   └── main.js            # CLI interface
├── abis/                  # Contract ABIs
├── reports/               # Generated reports
├── .env                   # Configuration
├── server.js              # API server
├── start.js               # Quick start script
└── report-manager.js      # Report management
```

## ⚙️ Configuration

The `.env` file contains all configuration:
- **Target Contract**: The contract you want to analyze
- **Competitors**: Up to 5 competitor contracts
- **RPC Endpoints**: Multiple providers with automatic failover
- **Analysis Parameters**: Block range (default 1000), whale thresholds, timeouts, etc.

## 📊 Output

Reports are generated in multiple formats:
- **JSON**: Machine-readable data
- **Markdown**: Human-readable reports
- **CSV**: Spreadsheet-compatible data

All reports are organized by contract name and chain in the `reports/` directory.

## 🔧 Supported Chains

- **Ethereum**: Full support with multiple RPC providers
- **Lisk**: EVM-compatible L2 with optimized gas costs
- **Starknet**: Cairo-based L2 with specialized RPC handling

## 💡 Features

- **Real-time Analysis**: Live blockchain data via RPC
- **Multi-chain Support**: Analyze contracts across different networks
- **Automatic Failover**: Multiple RPC providers for reliability
- **Organized Reports**: Clean folder structure by contract
- **Competitive Analysis**: Compare against up to 5 competitors
- **Rich Metrics**: 40+ DeFi and behavioral metrics
