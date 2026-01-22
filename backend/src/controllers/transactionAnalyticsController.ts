import { Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth';

export class TransactionAnalyticsController {
  constructor(private db: Pool) {}

  // GET /api/projects/:id/analytics/transaction-volume
  async getTransactionVolume(req: Request, res: Response) {
    try {
      const { id: projectId } = req.params;
      const userId = (req as any).user.id;
      const { timeframe = '30d', granularity = 'daily' } = req.query;

      // Verify project ownership
      const projectCheck = await this.db.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, u