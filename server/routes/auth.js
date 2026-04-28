const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile, logoutUser, getActiveUsers } = require('../controllers/authController');
const { protect, admin } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', loginUser);

// @route   GET /api/auth/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', protect, getUserProfile);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, logoutUser);

// @route   GET /api/auth/active-users
// @desc    Get all active users
// @access  Private/Admin
router.get('/active-users', protect, admin, getActiveUsers);

module.exports = router;
