const mongoose = require('mongoose');

const BouncedEmailSchema = new mongoose.Schema({
  // Student reference and snapshot data
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  studentName: {
    type: String,
    required: true,
    trim: true
  },
  studentEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  studentCourse: {
    type: String,
    default: ''
  },
  studentYear: {
    type: String,
    default: ''
  },
  studentRollNumber: {
    type: String,
    default: ''
  },

  // Event context
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  eventName: {
    type: String,
    default: ''
  },

  // QR Code context
  qrCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QRCode',
    default: null
  },

  // Error details
  errorMessage: {
    type: String,
    required: true
  },
  errorCode: {
    type: String,
    default: 'unknown'
  },
  smtpResponseCode: {
    type: Number,
    default: null
  },
  bounceType: {
    type: String,
    enum: ['invalid_address', 'mailbox_full', 'domain_error', 'rejected', 'unknown'],
    default: 'unknown'
  },

  // Resolution tracking
  status: {
    type: String,
    enum: ['pending', 'resolved', 'retry_success', 'retry_failed'],
    default: 'pending'
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolutionNotes: {
    type: String,
    default: ''
  },

  // Retry tracking
  retryCount: {
    type: Number,
    default: 0
  },
  lastRetryAt: {
    type: Date,
    default: null
  },
  correctedEmail: {
    type: String,
    default: null
  },

  // Batch context - which send operation caused this
  batchId: {
    type: String,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
BouncedEmailSchema.index({ status: 1, createdAt: -1 });
BouncedEmailSchema.index({ studentEmail: 1 });
BouncedEmailSchema.index({ event: 1, status: 1 });
BouncedEmailSchema.index({ batchId: 1 });

module.exports = mongoose.model('BouncedEmail', BouncedEmailSchema);
