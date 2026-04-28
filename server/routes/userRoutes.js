const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get user statistics - Available to all authenticated users
router.get('/stats', userController.getUserStats);

// Get all users - Admin only
router.get('/', userController.getAllUsers);

// Get user by ID - Admin only
router.get('/:id', userController.getUserById);

// Create a new user - Admin only
router.post('/', userController.createUser);

// Update a user - Admin only
router.put('/:id', userController.updateUser);

// Delete a user - Admin only
router.delete('/:id', userController.deleteUser);

module.exports = router;
