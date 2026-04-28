const express = require('express');
const router = express.Router();
const { 
  generateQRCodes, 
  verifyQRCode, 
  getAllQRCodes, 
  sendQRCodesByEmail,
  downloadQRCodes,
  downloadEventQRCodes,
  testEmailConfig,
  validateQRCodeAdmin
} = require('../controllers/qrController');
const { protect, admin } = require('../middleware/auth');

// @route   POST /api/qr/generate
// @desc    Generate QR codes
// @access  Private/Admin
router.post('/generate', protect, admin, generateQRCodes);

// @route   POST /api/qr/verify
// @desc    Verify QR code
// @access  Private
router.post('/verify', protect, verifyQRCode);

// @route   GET /api/qr
// @desc    Get all QR codes with filtering
// @access  Private/Admin
router.get('/', protect, admin, getAllQRCodes);

// @route   POST /api/qr/send-email
// @desc    Send QR codes via email
// @access  Private/Admin
router.post('/send-email', protect, admin, sendQRCodesByEmail);

// @route   POST /api/qr/download
// @desc    Download QR codes as PDF
// @access  Private/Admin
router.post('/download', protect, admin, downloadQRCodes);

// @route   GET /api/qr/download/:eventId
// @desc    Download all QR codes for an event as PDF
// @access  Private/Admin
router.get('/download/:eventId', protect, admin, downloadEventQRCodes);

// @route   POST /api/qr/test-email
// @desc    Test email configuration
// @access  Private/Admin
router.post('/test-email', protect, admin, testEmailConfig);

// @route   POST /api/qr/admin-validate
// @desc    Admin validation of QR code without marking as used
// @access  Private/Admin
router.post('/admin-validate', protect, admin, validateQRCodeAdmin);

module.exports = router;
