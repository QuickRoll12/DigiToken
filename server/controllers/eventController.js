const Event = require('../models/Event');
const QRCode = require('../models/QRCode');
const mongoose = require('mongoose');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
  try {
    const { name, description, date, venue, eligibleCourses, eligibleYears } = req.body;

    if (!name || !date || !venue) {
      return res.status(400).json({ message: 'Please provide name, date, and venue' });
    }

    const event = new Event({
      name,
      description,
      date,
      venue,
      eligibleCourses: eligibleCourses || [],
      eligibleYears: eligibleYears || [],
      createdBy: req.user._id
    });

    const createdEvent = await event.save();
    res.status(201).json(createdEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Private
const getEvents = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    const events = await Event.find(filter)
      .sort({ date: -1 })
      .populate('createdBy', 'name email');
      
    res.status(200).json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Private
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email');
      
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.status(200).json(event);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Admin
const updateEvent = async (req, res) => {
  try {
    const { name, description, date, venue, eligibleCourses, eligibleYears, isActive } = req.body;

    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Update fields
    if (name) event.name = name;
    if (description !== undefined) event.description = description;
    if (date) event.date = date;
    if (venue) event.venue = venue;
    if (eligibleCourses) event.eligibleCourses = eligibleCourses;
    if (eligibleYears) event.eligibleYears = eligibleYears;
    if (isActive !== undefined) event.isActive = isActive;
    
    event.updatedAt = Date.now();
    
    const updatedEvent = await event.save();
    res.status(200).json(updatedEvent);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if there are QR codes associated with this event
    const qrCodesCount = await QRCode.countDocuments({ event: req.params.id });
    
    if (qrCodesCount > 0) {
      // Instead of deleting, just mark as inactive
      event.isActive = false;
      await event.save();
      return res.status(200).json({ 
        message: 'Event has associated QR codes and cannot be deleted. It has been marked as inactive instead.' 
      });
    }
    
    await Event.deleteOne({ _id: req.params.id });
    res.status(200).json({ message: 'Event removed' });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get event statistics
// @route   GET /api/events/:id/stats
// @access  Private
const getEventStats = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Get QR code statistics
    const totalQRCodes = await QRCode.countDocuments({ event: eventId });
    const usedQRCodes = await QRCode.countDocuments({ event: eventId, isUsed: true });
    const unusedQRCodes = totalQRCodes - usedQRCodes;
    
    // Get course and year distribution
    const courseDistribution = await QRCode.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      { $group: { _id: '$course', count: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } } } },
      { $project: { course: '$_id', count: 1, used: 1, unused: { $subtract: ['$count', '$used'] } } }
    ]);
    
    const yearDistribution = await QRCode.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      { $group: { _id: '$year', count: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } } } },
      { $project: { year: '$_id', count: 1, used: 1, unused: { $subtract: ['$count', '$used'] } } }
    ]);
    
    // Get meal type distribution
    const mealTypeDistribution = await QRCode.aggregate([
      { $match: { event: new mongoose.Types.ObjectId(eventId) } },
      { $group: { _id: '$mealType', count: { $sum: 1 }, used: { $sum: { $cond: ['$isUsed', 1, 0] } } } },
      { $project: { mealType: '$_id', count: 1, used: 1, unused: { $subtract: ['$count', '$used'] } } }
    ]);
    
    // Get usage timeline (last 24 hours)
    const usageTimeline = await QRCode.aggregate([
      { 
        $match: { 
          event: new mongoose.Types.ObjectId(eventId), 
          isUsed: true,
          usedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$usedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    res.status(200).json({
      eventName: event.name,
      totalQRCodes,
      usedQRCodes,
      unusedQRCodes,
      usagePercentage: totalQRCodes > 0 ? (usedQRCodes / totalQRCodes) * 100 : 0,
      courseDistribution,
      yearDistribution,
      mealTypeDistribution,
      usageTimeline
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventStats
};
