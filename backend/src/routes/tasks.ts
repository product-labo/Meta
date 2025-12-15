import { Router } from 'express';
import { createTask, getTasks, updateTask, deleteTask } from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// Nested under projects: /api/projects/:projectId/tasks
// Authentication required for all task operations
router.post('/', authenticateToken, createTask);
router.get('/', authenticateToken, getTasks);
router.put('/:taskId', authenticateToken, updateTask);
router.delete('/:taskId', authenticateToken, deleteTask);

export default router;
