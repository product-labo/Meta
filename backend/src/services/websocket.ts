import { Server } from 'socket.io';
import { pool } from '../config/database.js';

let io: Server;

export const initializeWebSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log('Client connected:', socket.id);

        // Join dashboard room for real-time updates
        socket.on('join-dashboard', () => {
            socket.join('dashboard');
            console.log('Client joined dashboard room:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    // Start real-time metrics broadcasting
    startMetricsBroadcast();
    
    return io;
};

const startMetricsBroadcast = () => {
    // Broadcast updated metrics every 30 seconds
    setInterval(async () => {
        try {
            const metrics = await fetchLatestMetrics();
            io.to('dashboard').emit('metrics-update', metrics);
        } catch (error) {
            console.error('Error broadcasting metrics:', error);
        }
    }, 30000); // 30 seconds
};

const fetchLatestMetrics = async () => {
    const query = `
        SELECT 
            COUNT(DISTINCT c.contract_address) as total_projects,
            COUNT(DISTINCT wi.wallet_address) as total_customers,
            COALESCE(SUM(wi.value_eth), 0) as total_revenue,
            COALESCE(AVG(
                CASE 
                    WHEN customer_counts.customer_count >= 50 THEN 70
                    ELSE 50
                END
            ), 50) as avg_growth_score
        FROM mc_contracts c
        LEFT JOIN mc_wallet_interactions wi ON c.contract_address = wi.contract_address 
            AND c.chain_id = wi.chain_id
            AND wi.created_at >= NOW() - INTERVAL '24 hours'
        LEFT JOIN (
            SELECT 
                contract_address,
                chain_id,
                COUNT(DISTINCT wallet_address) as customer_count
            FROM mc_wallet_interactions
            GROUP BY contract_address, chain_id
        ) customer_counts ON c.contract_address = customer_counts.contract_address 
            AND c.chain_id = customer_counts.chain_id
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
};

export const broadcastMetricsUpdate = (metrics: any) => {
    if (io) {
        io.to('dashboard').emit('metrics-update', metrics);
    }
};
