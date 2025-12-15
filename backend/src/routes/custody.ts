
import { Router } from 'express';
import { createCustodialWallet, getCustodialWallets } from '../controllers/custodyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

router.post('/wallets', createCustodialWallet);
router.get('/wallets', getCustodialWallets);

export default router;
