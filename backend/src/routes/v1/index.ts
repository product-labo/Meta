import { Router } from 'express';
import userRoutes from './user.js';
import aiRoutes from './ai.js';

const router = Router();

// V1 API routes
router.use('/user', userRoutes);
router.use('/ai', aiRoutes);

// Health check for V1 API
router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            version: '1.0.0',
            timestamp: new Date().toISOString()
        }
    });
});

export default router;
