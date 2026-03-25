const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createTask,
  getTasksByRoom,
  updateTask,
  updateTaskStatus,
  reorderTasks,
  deleteTask,
} = require('../controllers/task.controller');

// Tất cả routes cần authentication
router.use(auth);

// CRUD routes
router.post('/', createTask);
router.get('/:roomId', getTasksByRoom);
router.patch('/reorder', reorderTasks);
router.patch('/:id', updateTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

module.exports = router;
