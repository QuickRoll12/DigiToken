const QRCode = require('../models/QRCode');
const Event = require('../models/Event');
const mongoose = require('mongoose');

// @desc    Get overall system statistics
// @route   GET /api/stats
// @access  Private/Admin
const getOverallStats = async (req, res) => {
  try {
    // Get total counts
    const totalEvents = await Event.countDocuments();
    const activeEvents = await Event.countDocuments({ isActive: true });
    const totalQRCodes = await QRCode.countDocuments();
    const usedQRCodes = await QRCode.countDocuments({ isUsed: true });
    
    // Get recent events
    const recentEvents = await Event.find()
      .sort({ date: -1 })
      .limit(5)
      .select('name date venue isActive');
    
    // Get recent QR code usage
    const recentUsage = await QRCode.find({ isUsed: true })
      .sort({ usedAt: -1 })
      .limit(10)
      .populate('event', 'name')
      .select('uniqueId course year mealType usedAt event');
    
    // Get usage by day (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const usageByDay = await QRCode.aggregate([
      {
        $match: {
          isUsed: true,
          usedAt: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$usedAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Get distribution by course
    const distributionByCourse = await QRCode.aggregate([
      {
        $group: {
          _id: '$course',
          total: { $sum: 1 },
          used: { $sum: { $cond: ['$isUsed', 1, 0] } }
        }
      },
      {
        $project: {
          course: '$_id',
          total: 1,
          used: 1,
          unused: { $subtract: ['$total', '$used'] }
        }
      },
      { $sort: { 'total': -1 } }
    ]);
    
    // Get distribution by year
    const distributionByYear = await QRCode.aggregate([
      {
        $group: {
          _id: '$year',
          total: { $sum: 1 },
          used: { $sum: { $cond: ['$isUsed', 1, 0] } }
        }
      },
      {
        $project: {
          year: '$_id',
          total: 1,
          used: 1,
          unused: { $subtract: ['$total', '$used'] }
        }
      },
      { $sort: { 'year': 1 } }
    ]);
    
    res.status(200).json({
      totalEvents,
      activeEvents,
      totalQRCodes,
      usedQRCodes,
      unusedQRCodes: totalQRCodes - usedQRCodes,
      usagePercentage: totalQRCodes > 0 ? (usedQRCodes / totalQRCodes) * 100 : 0,
      recentEvents,
      recentUsage,
      usageByDay,
      distributionByCourse,
      distributionByYear
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get QR code usage statistics
// @route   GET /api/stats/qr-usage
// @access  Private/Admin
const getQRUsageStats = async (req, res) => {
  try {
    const { startDate, endDate, eventId } = req.query;
    
    // Build match criteria
    const matchCriteria = { isUsed: true };
    
    if (startDate && endDate) {
      matchCriteria.usedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      matchCriteria.usedAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      matchCriteria.usedAt = { $lte: new Date(endDate) };
    }
    
    if (eventId) {
      matchCriteria.event = new mongoose.Types.ObjectId(eventId);
    }
    
    // Get hourly usage
    const hourlyUsage = await QRCode.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$usedAt' } },
            hour: { $hour: '$usedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          hour: '$_id.hour',
          count: 1
        }
      },
      { $sort: { 'date': 1, 'hour': 1 } }
    ]);
    
    // Get usage by event
    const usageByEvent = await QRCode.aggregate([
      { $match: { isUsed: true } },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'eventInfo'
        }
      },
      { $unwind: '$eventInfo' },
      {
        $group: {
          _id: '$event',
          eventName: { $first: '$eventInfo.name' },
          count: { $sum: 1 }
        }
      },
      { $sort: { 'count': -1 } }
    ]);
    
    // Get peak usage times
    const peakUsageTimes = await QRCode.aggregate([
      { $match: { isUsed: true } },
      {
        $group: {
          _id: { $hour: '$usedAt' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          hour: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { 'count': -1 } }
    ]);
    
    res.status(200).json({
      hourlyUsage,
      usageByEvent,
      peakUsageTimes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getOverallStats,
  getQRUsageStats
};
