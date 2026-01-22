# Multi-Chain Wallet Onboarding User Guide

## Overview

This guide walks you through the process of adding wallet addresses to your MetaGauge project for automatic blockchain data indexing. The system supports multiple blockchain networks including Ethereum, Polygon, Lisk, Arbitrum, Optimism, BSC, and Starknet.

## Getting Started

### Prerequisites

1. **MetaGauge Account**: You need a registered MetaGauge account
2. **Project Created**: You must have at least one project in your account
3. **Wallet Address**: The blockchain address you want to track

### Supported Blockchain Networks

#### EVM-Compatible Chains
- **Ethereum Mainnet** (`ethereum`)
- **Polygon** (`polygon`) 
- **Lisk L2** (`lisk`)
- **Arbitrum One** (`arbitrum`)
- **Optimism** (`optimism`)
- **Binance Smart Chain** (`bsc`)

#### Starknet
- **Starknet Mainnet** (`starknet-mainnet`)
- **Starknet Sepolia** (`starknet-sepolia`)

## Step-by-Step Onboarding Process

### Step 1: Access Your Project Dashboard

1. Log in to your MetaGauge account
2. Navigate to your project dashboard
3. Select the project where you want to add a wallet

### Step 2: Add a New Wallet

1. Click the **"Add Wallet"** button on your project dashboard
2. The wallet onboarding form will appear

### Step 3: Enter Wallet Information

#### For EVM Chains (Ethereum, Polygon, Lisk, etc.)

1. **Select Chain**: Choose your blockchain network from the dropdown
   - Example: Select "Lisk" for Lisk L2 addresses

2. **Enter Address**: Input your wallet address
   - Format: Must be exactly 42 characters starting with `0x`
   - Example: `0x4200000000000000000000000000000000000006`
   - The system will validate the format in real-time

3. **Add Description** (Optional): Provide a meaningful description
   - Example: "Main project treasury wallet" or "Lisk L2 Standard Bridge"

#### For Starknet

1. **Select Chain**: Choose "Starknet Mainnet" or "Starknet Sepolia"

2. **Enter Address**: Input your Starknet address
   - Format: Must be 64+ characters starting with `0x`
   - Example: `0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc`

3. **Add Description** (Optional): Describe the wallet's purpose

### Step 4: Submit and Start Indexing

1. Click **"Add Wallet"** to submit the form
2. The system will:
   - Validate your address format
   - Check for duplicates
   - Create an indexing job
   - Redirect you to the progress tracking page

### Step 5: Monitor Indexing Progress

Once your wallet is added, you'll see a real-time progress indicator showing:

- **Current Status**: Queued → Running → Completed
- **Progress Bar**: Visual representation of completion percentage
- **Block Progress**: Current block being processed vs. total blocks
- **Data Found**: Number of transactions and events discovered
- **Processing Speed**: Blocks processed per second
- **Time Remaining**: Estimated completion time

#### Progress States Explained

- **Queued**: Your indexing job is waiting to start
- **Running**: The system is actively fetching and processing your blockchain data
- **Completed**: All historical data has been successfully indexed
- **Error**: An issue occurred (with retry option available)

### Step 6: Access Your Data

After indexing completes, you can:

1. **View Dashboard**: See summary statistics for all your wallets
2. **Analyze Transactions**: Access detailed transaction history
3. **Monitor Events**: Review smart contract events
4. **Generate Reports**: Create custom analytics reports

## Managing Multiple Wallets

### Adding Additional Wallets

You can add multiple wallets to a single project:

1. Each wallet is indexed independently
2. Different chains can be mixed in one project
3. Progress is tracked separately for each wallet
4. Data remains isolated between wallets

### Wallet List View

Your project dashboard shows all wallets with:

- **Address**: The blockchain address
- **Chain**: Which network it's on
- **Status Badge**: Current indexing state
- **Last Sync**: When data was last updated
- **Transaction Count**: Total transactions found
- **Event Count**: Total events found
- **Actions**: Refresh data, view details

## Refreshing Wallet Data

### When to Refresh

Refresh your wallet data when:
- New transactions have occurred since last sync
- You want the most up-to-date information
- You're preparing reports or analysis

### How to Refresh

1. Go to your wallet list
2. Click **"Refresh Data"** next to the wallet
3. The system will:
   - Start from the last indexed block
   - Fetch only new data
   - Prevent duplicate entries
   - Update your statistics

### Refresh Progress

Similar to initial indexing, you'll see:
- Real-time progress updates
- New transactions and events found
- Estimated completion time

## Address Format Requirements

### EVM Address Format
```
✅ Valid:   0x4200000000000000000000000000000000000006
❌ Invalid: 4200000000000000000000000000000000000006  (missing 0x)
❌ Invalid: 0x4200000000000000000000000000000000000  (too short)
❌ Invalid: 0xGGGG000000000000000000000000000000000006  (invalid characters)
```

### Starknet Address Format
```
✅ Valid:   0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc
❌ Invalid: 066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc   (missing 0x)
❌ Invalid: 0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d7   (too short)
```

## Real-World Examples

### Example 1: DeFi Project on Lisk

**Scenario**: You have a DeFi protocol deployed on Lisk L2 and want to track the main contract activity.

**Steps**:
1. Select "Lisk" as your chain
2. Enter your contract address: `0x4200000000000000000000000000000000000006`
3. Description: "Lisk L2 Standard Bridge - Main Contract"
4. Submit and monitor indexing progress
5. Once complete, analyze bridge transactions and events

### Example 2: Multi-Chain NFT Project

**Scenario**: Your NFT collection is deployed on multiple chains.

**Steps**:
1. Add Ethereum wallet: `0x1234...` (Chain: Ethereum)
2. Add Polygon wallet: `0x1234...` (Chain: Polygon) 
3. Add Arbitrum wallet: `0x1234...` (Chain: Arbitrum)
4. Monitor each chain's indexing progress independently
5. Compare activity across chains in your dashboard

### Example 3: Starknet Application

**Scenario**: You have a Starknet-based application to monitor.

**Steps**:
1. Select "Starknet Mainnet" as your chain
2. Enter your contract address: `0x066a4ab71a6ebab9f91150868c0890959338e2f4a6cd6e9090c15dfd22d745bc`
3. Description: "Starknet Main Application Contract"
4. Submit and wait for Starknet-specific indexing to complete
5. Analyze Starknet transactions and internal calls

## Troubleshooting

### Common Issues

#### "Invalid Address Format" Error
- **EVM**: Ensure address is exactly 42 characters and starts with `0x`
- **Starknet**: Ensure address is 64+ characters and starts with `0x`
- Check for typos or extra spaces

#### "Wallet Already Exists" Error
- You've already added this address on this chain to this project
- Check your wallet list to see existing wallets
- You can add the same address on different chains

#### Indexing Stuck or Failed
- Check your internet connection
- Wait a few minutes and refresh the page
- Use the "Retry" button if available
- Contact support if the issue persists

#### Slow Indexing Progress
- Large wallets with many transactions take longer
- Network congestion can affect speed
- The system automatically optimizes performance
- Progress will continue in the background

### Getting Help

If you encounter issues:

1. **Check Status Page**: Visit status.metagauge.com for system status
2. **Documentation**: Review this guide and API documentation
3. **Support**: Contact support@metagauge.com with:
   - Your project ID
   - Wallet address causing issues
   - Screenshots of error messages
   - Steps you've already tried

## Best Practices

### Wallet Management
- Use descriptive names for your wallets
- Group related wallets in the same project
- Regularly refresh data for active wallets
- Monitor indexing status for new wallets

### Performance Optimization
- Add wallets during off-peak hours when possible
- Avoid adding many wallets simultaneously
- Use refresh instead of re-adding existing wallets
- Keep wallet descriptions concise but meaningful

### Data Organization
- Create separate projects for different applications
- Use consistent naming conventions
- Document wallet purposes in descriptions
- Regularly review and clean up unused wallets

## Advanced Features

### Bulk Wallet Import
For enterprise users with many wallets:
- Contact support for bulk import options
- Prepare CSV files with address, chain, and description
- Schedule imports during maintenance windows

### API Integration
For developers:
- Use the REST API for programmatic wallet management
- Implement WebSocket connections for real-time updates
- Build custom dashboards with our API
- Automate wallet refresh operations

### Custom Analytics
After indexing:
- Export transaction data for external analysis
- Create custom reports and visualizations
- Set up alerts for specific transaction patterns
- Integrate with business intelligence tools

## Next Steps

After successfully onboarding your wallets:

1. **Explore Analytics**: Use the dashboard to analyze your data
2. **Set Up Alerts**: Configure notifications for important events
3. **Create Reports**: Generate insights for stakeholders
4. **API Integration**: Connect your applications to MetaGauge data
5. **Scale Up**: Add more wallets and projects as needed

## Support and Resources

- **Documentation**: [docs.metagauge.com](https://docs.metagauge.com)
- **API Reference**: [api.metagauge.com/docs](https://api.metagauge.com/docs)
- **Status Page**: [status.metagauge.com](https://status.metagauge.com)
- **Support Email**: support@metagauge.com
- **Community**: [community.metagauge.com](https://community.metagauge.com)