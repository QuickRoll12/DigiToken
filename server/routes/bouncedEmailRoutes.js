const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const {
  getBouncedEmails,
  getBouncedEmailStats,
  getBouncedEmailById,
  resolveBouncedEmail,
  bulkResolveBouncedEmails,
  deleteBouncedEmail,
  bulkDeleteBouncedEmails,
  retryBouncedEmail,
  exportBouncedEmails
} = require('../controllers/bouncedEmailController');

// All routes require authentication + admin
router.use(protect, admin);

// Stats and export (must be before /:id routes)
router.get('/stats', getBouncedEmailStats);
router.get('/export', exportBouncedEmails);

// Bulk operations
router.put('/bulk-resolve', bulkResolveBouncedEmails);
router.delete('/bulk-delete', bulkDeleteBouncedEmails);

// CRUD
router.get('/', getBouncedEmails);
router.get('/:id', getBouncedEmailById);
router.put('/:id/resolve', resolveBouncedEmail);
router.post('/:id/retry', retryBouncedEmail);
router.delete('/:id', deleteBouncedEmail);

module.exports = router;
