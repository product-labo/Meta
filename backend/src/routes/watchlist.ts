import { Router } from 'express';
import { addToWatchlist, removeFromWatchlist, getWatchlist } from '../controllers/watchlistController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getWatchlist);
router.post('/', addToWatchlist);
router.delete('/:projectId', removeFromWatchlist);

export default router;
