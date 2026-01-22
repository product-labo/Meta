import { Router } from 'express';
import { 
    getTasks, 
    createTask, 
    updateTask, 
    deleteTask, 
    searchTasks, 
    filterTasks, 
    getTaskComments, 
    addTaskComment, 
    updateTaskPriority, 
    getTaskAnalytics 
} from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// =============================================================================
// B2: TASK MANAGEMENT (10 endpoints)
// Nested under projects: /api/projects/:projectId/tasks
// =============================================================================

// Authentication required for all task operations
router.use(authenticateToken);

router.get('/', getTasks);
router.post('/', createTask);
router.put('/:taskId', updateTask);
router.delete('/:taskId', deleteTask);
router.get('/search', searchTasks);
router.get('/filter', filterTasks);
router.get('/:taskId/comments', getTaskComments);
router.post('/:taskId/comments', addTaskComment);
router.put('/:taskId/priority', updateTaskPriority);
router.get('/analytics', getTaskAnalytics);

export default router;
