import { Router } from 'express';
import { validateWallet, getUserWallets } from '../controllers/walletController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/validate', validateWallet);
router.get('/user/wallets', getUserWallets); // This matches the specific requirement for user-wide wallet fetch

export default router;
