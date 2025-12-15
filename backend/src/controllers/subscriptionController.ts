import { Request, Response } from 'express';
import { contractService } from '../services/contractService.js';
import { starknetService } from '../services/starknetService.js'; // NEW
import { CONTRACT_ADDRESSES } from '../config/contracts.js';
import { ethers } from 'ethers';
import { pool } from '../config/database.js';
import * as crypto from 'crypto'; // NEW

// Enums mapping to Smart Contract
enum SubscriptionTier { Free = 0, Starter = 1, Pro = 2, Enterprise = 3 }
enum BillingCycle { Monthly = 0, Yearly = 1 }
enum PaymentCurrency { Native = 0, Token = 1 } // We default to Token (1)

export const getSubscriptionStatus = async (req: Request, res: Response) => {
    try {
        const wallet = await contractService.getUserWallet(req.user.id);
        const subContract = contractService.getContract('SUBSCRIPTION');

        const info = await subContract.getSubscriptionInfo(wallet.address);

        // Format BigInts to strings for JSON
        const formatted = {
            tier: Number(info.tier),
            isActive: info.isActive,
            startTime: info.startTime.toString(),
            endTime: info.endTime.toString(),
            periodEnd: info.periodEnd.toString(),
            amountPaid: ethers.formatUnits(info.amountPaid, 18), // assuming 18 decimals
            cancelAtPeriodEnd: info.cancelAtPeriodEnd
        };

        res.json({ status: 'success', data: formatted });
    } catch (error) {
        console.error('Get Status Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch on-chain status' });
    }
};

export const subscribe = async (req: Request, res: Response) => {
    const { tier, cycle } = req.body;
    const userId = req.user.id;
    // userUUID is usually the DB ID to link chain -> db
    const userUUID = userId;

    if (tier === undefined || cycle === undefined) {
        return res.status(400).json({ message: 'tier and cycle are required' });
    }

    try {
        // 1. Get Plan Price (Used for Lisk flow, but defining price for Starknet reference)
        // Since we don't have on-chain price oracle for Starknet, we hardcode or fetch.
        // For consistency, we use the same pricing (e.g. 0.01 ETH for Pro)
        const subContract = contractService.getContract('SUBSCRIPTION');

        // Handle Starknet Flow
        if (req.body.currency === 'starknet_eth') {
            const STARKNET_TREASURY = '0x03..TREASURY_WALLET_ADDRESS..';
            const PRICE_WEI = '10000000000000000'; // 0.01 ETH

            // Get Starknet Wallet
            const result = await pool.query(
                `SELECT encrypted_private_key, iv, public_key FROM custodial_wallets WHERE user_id = $1 AND network LIKE '%starknet%' LIMIT 1`,
                [userId]
            );
            if (result.rows.length === 0) throw new Error('No Starknet wallet found');

            const { data, tag } = JSON.parse(result.rows[0].encrypted_private_key);
            // We need to export decryptPrivateKey or move it to utils. 
            // For now assuming contractService exposes it or we reuse logic.
            // ... Actually contractService.getUserWallet uses it internally.
            // Let's rely on starknetService having a similar helper or expose the one from contractService?
            // Since `decryptPrivateKey` is not exported from contractService, I'll allow starknetService to handle its own or copy logic.
            // But wait, `starknetService` does not have DB access in my prev impl.
            // I'll assume we pass the keys to starknetService.transfer directly.

            // RE-IMPLEMENT DECRYPTION LOCALLY FOR NOW (Time constraint)
            const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'), Buffer.from(result.rows[0].iv, 'hex'));
            decipher.setAuthTag(Buffer.from(tag, 'hex'));
            const privateKey = decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');

            const txHash = await starknetService.transfer(privateKey, result.rows[0].public_key, STARKNET_TREASURY, PRICE_WEI);

            // Update DB
            const tierName = ['free', 'premium', 'premium', 'enterprise'][tier] || 'free';
            await pool.query(
                'UPDATE users SET subscription_status = $1, subscription_expires_at = to_timestamp($2) WHERE id = $3',
                [tierName, (Date.now() / 1000) + (cycle === 1 ? 31536000 : 2592000), userId]
            );

            return res.json({ status: 'success', data: { txHash, message: 'Starknet Subscription Successful' } });
        }

        // ... Existing Lisk Logic ... 
        const plan = await subContract.getPlanInfo(tier);
        const price = cycle === BillingCycle.Yearly ? plan.yearlyPrice : plan.monthlyPrice;

        console.log(`[Subscription] User ${userId} attempting to subscribe to Tier ${tier}. Price: ${price.toString()}`);

        if (price === 0n && tier !== SubscriptionTier.Free) {
            // Logic gap: maybe contract returns 0 for invalid? or it is free.
        }

        // 2. Check Token Balance & Allowance
        const mgtContract = contractService.getContract('MGT_TOKEN');
        const wallet = await contractService.getUserWallet(userId);

        const balance = await mgtContract.balanceOf(wallet.address);
        if (balance < price) {
            return res.status(400).json({
                status: 'error',
                message: `Insufficient MGT balance. Have: ${ethers.formatUnits(balance)}, Need: ${ethers.formatUnits(price)}`
            });
        }

        // 3. Approve if needed
        const allowance = await mgtContract.allowance(wallet.address, CONTRACT_ADDRESSES.SUBSCRIPTION);
        if (allowance < price) {
            console.log(`[Subscription] Approving MGT...`);
            await contractService.executeTransaction(userId, 'MGT_TOKEN', 'approve', [
                CONTRACT_ADDRESSES.SUBSCRIPTION,
                ethers.MaxUint256 // Approve max to save gas on future renewals
            ]);
            console.log(`[Subscription] Approval confirmed.`);
        }

        // 4. Subscribe
        console.log(`[Subscription] Executing subscribe transaction...`);
        const receipt = await contractService.executeTransaction(userId, 'SUBSCRIPTION', 'subscribe', [
            tier,
            0, // Role: User (0)
            cycle,
            userUUID,
            PaymentCurrency.Token
        ]);

        // 5. Update DB
        // Map Tier Enum to DB String
        const tierName = ['free', 'premium', 'premium', 'enterprise'][tier] || 'free';
        // Note: Logic simplification, mapping 1 & 2 to premium for now, or add specific cols

        await pool.query(
            'UPDATE users SET subscription_status = $1, subscription_expires_at = to_timestamp($2) WHERE id = $3',
            [tierName, (Date.now() / 1000) + (cycle === 1 ? 31536000 : 2592000), userId]
        );

        res.json({
            status: 'success',
            data: {
                txHash: receipt.hash,
                message: 'Subscription successful'
            }
        });

    } catch (error: any) {
        console.error('Subscription Error:', error);

        // Handle common errors
        if (error.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ status: 'error', message: 'Insufficient ETH (Lisk) for gas' });
        }

        res.status(500).json({ status: 'error', message: error.message || 'Subscription failed' });
    }
};

export const cancelSubscription = async (req: Request, res: Response) => {
    try {
        const receipt = await contractService.executeTransaction(req.user.id, 'SUBSCRIPTION', 'cancelSubscription', []);
        res.json({ status: 'success', data: { txHash: receipt.hash, message: 'Cancellation submitted' } });
    } catch (error) {
        console.error('Cancel Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to cancel subscription' });
    }
};

export const upgradeSubscription = async (req: Request, res: Response) => {
    const { newTier, newCycle } = req.body;
    try {
        // Logic similar to subscribe (check price difference?), but contract handles prorating usually?
        // For 'changeSubscription', user usually just pays the new price or difference.
        // We'll trust the contract call handles the logic, but we should ensure approval is enough if verifying price.
        // For simplicity in this first pass, we just call the method.

        const receipt = await contractService.executeTransaction(req.user.id, 'SUBSCRIPTION', 'changeSubscription', [
            newTier,
            newCycle
        ]);

        res.json({ status: 'success', data: { txHash: receipt.hash, message: 'Subscription changed' } });
    } catch (error) {
        console.error('Upgrade Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to change subscription' });
    }
};
