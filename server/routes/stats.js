const express = require('express');
const router = express.Router();
const { getOverallStats, getQRUsageStats } = require('../controllers/statsController');
const { protect, admin } = require('../middleware/auth');

// @route   GET /api/stats
// @desc    Get overall system statistics
// @access  Private/Admin
router.get('/', protect, admin, getOverallStats);

// @route   GET /api/stats/qr-usage
// @desc    Get QR code usage statistics
// @access  Private/Admin
router.get('/qr-usage', protect, admin, getQRUsageStats);

module.exports = router;
