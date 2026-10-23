const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  seedDemoTasks,
  bulkAction,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

router.get('/', getTasks);
router.post('/', createTask);
router.post('/seed', seedDemoTasks);
router.post('/bulk', bulkAction);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);

module.exports = router;

module.exports = router;