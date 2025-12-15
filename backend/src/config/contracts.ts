import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to find the project root (where metasmart folder is)
const rootDir = path.resolve(__dirname, '../../');

export const CONTRACT_ADDRESSES = {
    MGT_TOKEN: '0xB51623F59fF9f2AA7d3bC1Afa99AE0fA8049ed3D',
    SUBSCRIPTION: '0x577d9A43D0fa564886379bdD9A56285769683C38'
};

const loadAbi = (filename: string) => {
    try {
        const filePath = path.join(rootDir, 'metasmart', 'abi', filename);
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data); // The file contains the array directly based on previous view_file
    } catch (error) {
        console.error(`Failed to load ABI for ${filename}:`, error);
        return [];
    }
};

export const ABIS = {
    MGT_TOKEN: loadAbi('MetaGaugeToken.json'),
    SUBSCRIPTION: loadAbi('MetaGaugeSubscription.json')
};

export const RPC_URL = process.env.LISK_SEPOLIA_RPC || 'https://rpc.sepolia-api.lisk.com';
export const CHAIN_ID = 4202;
