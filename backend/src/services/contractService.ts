import { ethers } from 'ethers';
import { pool } from '../config/database.js';
import * as crypto from 'crypto';
import { CONTRACT_ADDRESSES, RPC_URL, ABIS } from '../config/contracts.js';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is required in .env');
}

/**
 * Decrypts a stored private key
 */
const decryptPrivateKey = (encryptedData: string, ivHex: string, authTagHex: string): string => {
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

export class ContractService {
    private provider: ethers.JsonRpcProvider;

    constructor() {
        this.provider = new ethers.JsonRpcProvider(RPC_URL);
    }

    /**
     * Get a wallet instance for a specific user
     */
    async getUserWallet(userId: string): Promise<ethers.Wallet> {
        // Get encrypted key from DB
        const result = await pool.query(
            'SELECT encrypted_private_key, iv, address FROM custodial_wallets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error('Custodial wallet not found for user');
        }

        const walletData = result.rows[0];
        const { data, tag } = JSON.parse(walletData.encrypted_private_key); // stored as JSON string in encrypted_private_key column

        const privateKey = decryptPrivateKey(data, walletData.iv, tag);
        return new ethers.Wallet(privateKey, this.provider);
    }

    /**
     * Get Read-Only Contract Instance
     */
    getContract(name: 'SUBSCRIPTION' | 'MGT_TOKEN') {
        return new ethers.Contract(CONTRACT_ADDRESSES[name], ABIS[name], this.provider);
    }

    /**
     * Execute a write transaction as a user
     */
    async executeTransaction(
        userId: string,
        contractName: 'SUBSCRIPTION' | 'MGT_TOKEN',
        methodName: string,
        args: any[]
    ) {
        const wallet = await this.getUserWallet(userId);
        const contractAddress = CONTRACT_ADDRESSES[contractName];
        const abi = ABIS[contractName];

        const contract = new ethers.Contract(contractAddress, abi, wallet);

        console.log(`[ContractService] ${userId} calling ${contractName}.${methodName}`, args);

        // Estimate Gas (add 20% buffer)
        let gasLimit;
        try {
            const estimate = await contract[methodName].estimateGas(...args);
            gasLimit = (estimate * 120n) / 100n; // +20%
        } catch (error) {
            console.warn('Gas estimation failed, using default fallback', error);
            gasLimit = 3000000n; // Safe fallback for complex calls
        }

        // Execute
        const tx = await contract[methodName](...args, { gasLimit });
        console.log(`[ContractService] Tx sent: ${tx.hash}`);

        // Wait for 1 confirmation
        const receipt = await tx.wait(1);
        return receipt;
    }
}

export const contractService = new ContractService();
