const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'david_user',
    password: 'Davidsoyaya@1015',
    database: 'david',
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/contract-business', async (req, res) => {
    try {
        const query = `
            SELECT 
                bci.contract_address,
                bci.contract_name as business_name,
                bci.category as category_name,
                COALESCE(mc.chain_name, 'Unknown') as chain_name,
                bci.is_verified,
                COUNT(DISTINCT td.from_address) as total_customers,
                COUNT(*) as total_transactions,
                COALESCE(SUM(td.transaction_value), 0) as total_revenue_eth
            FROM bi_contract_index bci
            LEFT JOIN mc_chains mc ON bci.chain_id = mc.chain_id
            LEFT JOIN mc_transaction_details td ON bci.contract_address = td.contract_address 
            GROUP BY bci.contract_address, bci.contract_name, bci.category, bci.chain_id, bci.is_verified, mc.chain_name
            LIMIT 10
        `;
        
        const result = await pool.query(query);
        
        res.json({
            success: true,
            data: {
                businesses: result.rows
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3003;
app.listen(PORT, () => {
    console.log(`Simple server running on port ${PORT}`);
});
