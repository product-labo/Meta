
import { dbService } from './DbService';

const CYCLE_DURATION_MS = 30 * 60 * 1000; // 30 mins

export class DataRotator {
    private currentCycleId: number | null = null;
    private rotationTimer: NodeJS.Timeout | null = null;

    activeCycleStart: number = 0;

    constructor() { }

    async start() {
        console.log('[DataRotator] Starting...');
        await this.rotate();

        // Schedule interval
        this.rotationTimer = setInterval(async () => {
            await this.rotate();
        }, CYCLE_DURATION_MS);
    }

    async rotate() {
        console.log('[DataRotator] Initiating Rotation Cycle...');

        try {
            // 1. Close current cycle if exists
            if (this.currentCycleId) {
                await dbService.query(
                    'UPDATE mc_rotation_cycles SET end_time = NOW(), status = $1 WHERE id = $2',
                    ['COMPLETED', this.currentCycleId]
                );
            }

            // 2. Wipe Volatile Tables (The "Transient" Requirement)
            console.log('[DataRotator] Wiping volatile data...');
            await dbService.query('TRUNCATE TABLE mc_chain_snapshots, mc_entity_snapshots, mc_contract_state, mc_event_logs, mc_transactions RESTART IDENTITY CASCADE');

            // 3. Create New Cycle
            const res = await dbService.query(
                'INSERT INTO mc_rotation_cycles (start_time, status) VALUES (NOW(), $1) RETURNING id',
                ['ACTIVE']
            );

            this.currentCycleId = res.rows[0].id;
            this.activeCycleStart = Date.now();

            console.log(`[DataRotator] New Cycle Started: ID ${this.currentCycleId}`);

        } catch (error) {
            console.error('[DataRotator] Rotation Failed:', error);
        }
    }

    getCurrentCycleId() {
        return this.currentCycleId;
    }
}

export const dataRotator = new DataRotator();
