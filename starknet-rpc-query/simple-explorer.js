const { Client } = require('pg');
const express = require('express');
require('dotenv').config();

const app = express();
const port = 3001;

// Database client
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Connect to database
client.connect().then(() => {
  console.log('✅ Connected to database');
}).catch(err => {
  console.error('❌ Database connection failed:', err);
});

// Serve static HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Starknet Explorer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .hash { font-family: monospace; font-size: 0.9em; }
        .truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .refresh-btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Starknet Blockchain Explorer</h1>
            <p>Real-time data from your indexed Starknet database</p>
            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Data</button>
        </div>
        
        <div id="stats" class="stats">
            <div class="stat-card">
                <div class="stat-number" id="blockCount">Loading...</div>
                <div class="stat-label">Total Blocks</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="txCount">Loading...</div>
                <div class="stat-label">Total Transactions</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="contractCount">Loading...</div>
                <div class="stat-label">Total Contracts</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="eventCount">Loading...</div>
                <div class="stat-label">Total Events</div>
            </div>
        </div>

        <div class="section">
            <h2>📦 Latest Blocks</h2>
            <div id="latestBlocks">Loading...</div>
        </div>

        <div class="section">
            <h2>💸 Recent Transactions</h2>
            <div id="recentTransactions">Loading...</div>
        </div>

        <div class="section">
            <h2>📋 Active Contracts</h2>
            <div id="activeContracts">Loading...</div>
        </div>
    </div>

    <script>
        // Load data when page loads
        window.onload = function() {
            loadStats();
            loadLatestBlocks();
            loadRecentTransactions();
            loadActiveContracts();
        };

        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();
                document.getElementById('blockCount').textContent = stats.blocks.toLocaleString();
                document.getElementById('txCount').textContent = stats.transactions.toLocaleString();
                document.getElementById('contractCount').textContent = stats.contracts.toLocaleString();
                document.getElementById('eventCount').textContent = stats.events.toLocaleString();
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        async function loadLatestBlocks() {
            try {
                const response = await fetch('/api/blocks/latest');
                const blocks = await response.json();
                let html = '<table><tr><th>Block Number</th><th>Hash</th><th>Timestamp</th><th>Transactions</th></tr>';
                blocks.forEach(block => {
                    const date = new Date(block.timestamp * 1000).toLocaleString();
                    html += \`<tr>
                        <td>\${block.block_number}</td>
                        <td class="hash truncate">\${block.block_hash}</td>
                        <td>\${date}</td>
                        <td>\${block.tx_count || 0}</td>
                    </tr>\`;
                });
                html += '</table>';
                document.getElementById('latestBlocks').innerHTML = html;
            } catch (error) {
                document.getElementById('latestBlocks').innerHTML = 'Failed to load blocks';
            }
        }

        async function loadRecentTransactions() {
            try {
                const response = await fetch('/api/transactions/recent');
                const transactions = await response.json();
                let html = '<table><tr><th>Transaction Hash</th><th>Block</th><th>Type</th><th>Sender</th></tr>';
                transactions.forEach(tx => {
                    html += \`<tr>
                        <td class="hash truncate">\${tx.tx_hash}</td>
                        <td>\${tx.block_number}</td>
                        <td>\${tx.tx_type}</td>
                        <td class="hash truncate">\${tx.sender_address || 'N/A'}</td>
                    </tr>\`;
                });
                html += '</table>';
                document.getElementById('recentTransactions').innerHTML = html;
            } catch (error) {
                document.getElementById('recentTransactions').innerHTML = 'Failed to load transactions';
            }
        }

        async function loadActiveContracts() {
            try {
                const response = await fetch('/api/contracts/active');
                const contracts = await response.json();
                let html = '<table><tr><th>Contract Address</th><th>Class Hash</th><th>Deployment Block</th><th>Interactions</th></tr>';
                contracts.forEach(contract => {
                    html += \`<tr>
                        <td class="hash truncate">\${contract.contract_address}</td>
                        <td class="hash truncate">\${contract.class_hash}</td>
                        <td>\${contract.deployment_block || 'N/A'}</td>
                        <td>\${contract.interaction_count || 0}</td>
                    </tr>\`;
                });
                html += '</table>';
                document.getElementById('activeContracts').innerHTML = html;
            } catch (error) {
                document.getElementById('activeContracts').innerHTML = 'Failed to load contracts';
            }
        }
    </script>
</body>
</html>
  `);
});

// API endpoints
app.get('/api/stats', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM blocks) as blocks,
        (SELECT COUNT(*) FROM transactions) as transactions,
        (SELECT COUNT(*) FROM contracts) as contracts,
        (SELECT COUNT(*) FROM events) as events
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/blocks/latest', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT b.block_number, b.block_hash, b.timestamp, b.finality_status,
             COUNT(t.tx_hash) as tx_count
      FROM blocks b
      LEFT JOIN transactions t ON b.block_number = t.block_number
      GROUP BY b.block_number, b.block_hash, b.timestamp, b.finality_status
      ORDER BY b.block_number DESC 
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions/recent', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT tx_hash, block_number, tx_type, sender_address
      FROM transactions 
      ORDER BY block_number DESC 
      LIMIT 20
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/contracts/active', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT c.contract_address, c.class_hash, c.deployment_block,
             COUNT(wi.wallet_address) as interaction_count
      FROM contracts c
      LEFT JOIN wallet_interactions wi ON c.contract_address = wi.contract_address
      GROUP BY c.contract_address, c.class_hash, c.deployment_block
      ORDER BY interaction_count DESC
      LIMIT 15
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`🚀 Starknet Explorer running at http://localhost:${port}`);
  console.log(`📊 Database: ${process.env.DB_NAME}`);
  console.log(`🔗 RPC: ${process.env.STARKNET_RPC_URL}`);
  console.log(`\n🎯 Open your browser and visit: http://localhost:${port}`);
});