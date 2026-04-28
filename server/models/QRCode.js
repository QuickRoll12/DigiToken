const mongoose = require('mongoose');

const QRCodeSchema = new mongoose.Schema({
  uniqueId: {
    type: String,
    required: true,
    unique: true
  },
  course: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  mealType: {
    type: String,
    enum: ['veg', 'non-veg', 'any'],
    default: 'any'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  usedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  qrImageUrl: {
    type: String,
    default: null
  },
  email: {
    type: String,
    default: null
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('QRCode', QRCodeSchema);
