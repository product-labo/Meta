
import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import * as crypto from 'crypto';
import { ethers } from 'ethers';

// Encryption settings
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // Fallback dev key

const encrypt = (text: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
};

import { starknetService } from '../services/starknetService.js';

/**
 * Service to generate a custodial wallet for a user.
 * Can be called internally by other controllers.
 */
export const generateCustodialWalletService = async (userId: string, projectId: string | null = null, network: string = 'mainnet') => {
    console.log(`[CustodyService] Generating wallet for user: ${userId}, project: ${projectId}, network: ${network}`);

    // 0. Check for existing wallet (Idempotency)
    // If projectId is null, we look for wallet with null project_id (global user wallet)
    // AND matching network
    let queryStr = 'SELECT * FROM custodial_wallets WHERE user_id = $1 AND project_id IS NULL AND network = $2';
    let params: any[] = [userId, network];

    if (projectId) {
        queryStr = 'SELECT * FROM custodial_wallets WHERE user_id = $1 AND project_id = $2 AND network = $3';
        params = [userId, projectId, network];
    }

    const existing = await pool.query(queryStr, params);
    if (existing.rows.length > 0) {
        console.log(`[CustodyService] Returning existing wallet for user: ${userId}`);
        return existing.rows[0];
    }

    // 1. Generate Wallet
    let address, privateKey, publicKey;
    const isStarknet = network.includes('starknet');

    if (isStarknet) {
        const creds = starknetService.generateCredential();
        privateKey = creds.privateKey;
        publicKey = creds.publicKey;
        address = starknetService.calculateAddress(publicKey);
    } else if (network === 'zcash') {
        // Zcash Wallet Generation (Mock for now as 'zcash-bitcore-lib' or equivalent is not installed)
        // In production, use a proper Zcash library to generate Unified Addresses
        const zcashMock = ethers.Wallet.createRandom(); // Using random bytes source
        privateKey = zcashMock.privateKey; // Placeholder
        publicKey = zcashMock.publicKey;   // Placeholder
        // Mocking a Zcash Unified Address
        address = `u1${zcashMock.address.substring(2).toLowerCase()}zcashmockaddress`;
        console.log('[CustodyService] Generated Mock Zcash Wallet');
    } else {
        // Default EVM (Ethereum, Lisk, etc.)
        const wallet = ethers.Wallet.createRandom();
        address = wallet.address;
        privateKey = wallet.privateKey;
        publicKey = wallet.publicKey;
    }

    // 2. Encrypt Private Key
    const { encryptedData, iv, authTag } = encrypt(privateKey);
    const storagePayload = JSON.stringify({
        data: encryptedData,
        tag: authTag
    });

    // 3. Store in custodial_wallets
    const result = await pool.query(
        `INSERT INTO custodial_wallets (
            user_id, project_id, address, public_key, encrypted_private_key, iv, network
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, address, created_at, network`,
        [userId, projectId, address, publicKey, storagePayload, iv, network]
    );

    return result.rows[0];
};

export const createCustodialWallet = async (req: Request, res: Response) => {
    const { projectId } = req.body;
    const userId = req.user.id;

    try {
        const wallet = await generateCustodialWalletService(userId, projectId);

        res.status(201).json({
            status: 'success',
            data: {
                ...wallet,
                message: 'Custodial wallet created securely'
            }
        });
    } catch (error) {
        console.error('Custodial wallet creation error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create custodial wallet' });
    }
};

export const getCustodialWallets = async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            'SELECT id, address, network, created_at, project_id FROM custodial_wallets WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        console.error('Get custodial wallets error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch wallets' });
    }
};
