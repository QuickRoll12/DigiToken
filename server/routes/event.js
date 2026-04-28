const express = require('express');
const router = express.Router();
const { 
  createEvent, 
  getEvents, 
  getEventById, 
  updateEvent, 
  deleteEvent, 
  getEventStats 
} = require('../controllers/eventController');
const { protect, admin } = require('../middleware/auth');

// @route   POST /api/events
// @desc    Create a new event
// @access  Private/Admin
router.post('/', protect, admin, createEvent);

// @route   GET /api/events
// @desc    Get all events
// @access  Private
router.get('/', protect, getEvents);

// @route   GET /api/events/:id
// @desc    Get event by ID
// @access  Private
router.get('/:id', protect, getEventById);

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private/Admin
router.put('/:id', protect, admin, updateEvent);

// @route   DELETE /api/events/:id
// @desc    Delete event
// @access  Private/Admin
router.delete('/:id', protect, admin, deleteEvent);

// @route   GET /api/events/:id/stats
// @desc    Get event statistics
// @access  Private
router.get('/:id/stats', protect, getEventStats);

module.exports = router;
