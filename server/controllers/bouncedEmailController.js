const BouncedEmail = require('../models/BouncedEmail');
const QRCode = require('../models/QRCode');
const Student = require('../models/Student');
const nodemailer = require('nodemailer');
const qrcode = require('qrcode');

// @desc    Get all bounced emails with filtering
// @route   GET /api/bounced-emails
// @access  Private/Admin
const getBouncedEmails = async (req, res) => {
  try {
    const { status, event, course, year, search, page = 1, limit = 50 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (event) filter.event = event;
    if (course) filter.studentCourse = course;
    if (year) filter.studentYear = year;

    if (search) {
      filter.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentEmail: { $regex: search, $options: 'i' } },
        { studentRollNumber: { $regex: search, $options: 'i' } },
        { errorMessage: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bouncedEmails, total] = await Promise.all([
      BouncedEmail.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('event', 'name date')
        .populate('resolvedBy', 'name email'),
      BouncedEmail.countDocuments(filter)
    ]);

    res.status(200).json({
      bouncedEmails,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error in getBouncedEmails:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get bounced email statistics
// @route   GET /api/bounced-emails/stats
// @access  Private/Admin
const getBouncedEmailStats = async (req, res) => {
  try {
    const [totalBounced, pendingCount, resolvedCount, retrySuccessCount, retryFailedCount] = await Promise.all([
      BouncedEmail.countDocuments(),
      BouncedEmail.countDocuments({ status: 'pending' }),
      BouncedEmail.countDocuments({ status: 'resolved' }),
      BouncedEmail.countDocuments({ status: 'retry_success' }),
      BouncedEmail.countDocuments({ status: 'retry_failed' })
    ]);

    // Get bounced by event
    const byEvent = await BouncedEmail.aggregate([
      {
        $group: {
          _id: '$event',
          eventName: { $first: '$eventName' },
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'retry_success']] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get bounced by type
    const byType = await BouncedEmail.aggregate([
      {
        $group: {
          _id: '$bounceType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      total: totalBounced,
      pending: pendingCount,
      resolved: resolvedCount,
      retrySuccess: retrySuccessCount,
      retryFailed: retryFailedCount,
      byEvent,
      byType
    });
  } catch (error) {
    console.error('Error in getBouncedEmailStats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get a single bounced email by ID
// @route   GET /api/bounced-emails/:id
// @access  Private/Admin
const getBouncedEmailById = async (req, res) => {
  try {
    const bouncedEmail = await BouncedEmail.findById(req.params.id)
      .populate('event', 'name date venue')
      .populate('student', 'name email course year rollNumber')
      .populate('resolvedBy', 'name email');

    if (!bouncedEmail) {
      return res.status(404).json({ message: 'Bounced email record not found' });
    }

    res.status(200).json(bouncedEmail);
  } catch (error) {
    console.error('Error in getBouncedEmailById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark a bounced email as resolved
// @route   PUT /api/bounced-emails/:id/resolve
// @access  Private/Admin
const resolveBouncedEmail = async (req, res) => {
  try {
    const { notes } = req.body;

    const bouncedEmail = await BouncedEmail.findById(req.params.id);
    if (!bouncedEmail) {
      return res.status(404).json({ message: 'Bounced email record not found' });
    }

    bouncedEmail.status = 'resolved';
    bouncedEmail.resolvedAt = new Date();
    bouncedEmail.resolvedBy = req.user._id;
    if (notes) bouncedEmail.resolutionNotes = notes;

    await bouncedEmail.save();

    res.status(200).json({ message: 'Bounced email marked as resolved', bouncedEmail });
  } catch (error) {
    console.error('Error in resolveBouncedEmail:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Bulk resolve bounced emails
// @route   PUT /api/bounced-emails/bulk-resolve
// @access  Private/Admin
const bulkResolveBouncedEmails = async (req, res) => {
  try {
    const { ids, notes } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide bounced email IDs' });
    }

    const result = await BouncedEmail.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: req.user._id,
          resolutionNotes: notes || 'Bulk resolved'
        }
      }
    );

    res.status(200).json({
      message: `${result.modifiedCount} bounced emails marked as resolved`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in bulkResolveBouncedEmails:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a bounced email record
// @route   DELETE /api/bounced-emails/:id
// @access  Private/Admin
const deleteBouncedEmail = async (req, res) => {
  try {
    const bouncedEmail = await BouncedEmail.findById(req.params.id);
    if (!bouncedEmail) {
      return res.status(404).json({ message: 'Bounced email record not found' });
    }

    await bouncedEmail.deleteOne();
    res.status(200).json({ message: 'Bounced email record deleted' });
  } catch (error) {
    console.error('Error in deleteBouncedEmail:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Bulk delete bounced email records
// @route   DELETE /api/bounced-emails/bulk-delete
// @access  Private/Admin
const bulkDeleteBouncedEmails = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide bounced email IDs' });
    }

    const result = await BouncedEmail.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      message: `${result.deletedCount} bounced email records deleted`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in bulkDeleteBouncedEmails:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Retry sending email to a bounced student with corrected email
// @route   POST /api/bounced-emails/:id/retry
// @access  Private/Admin
const retryBouncedEmail = async (req, res) => {
  try {
    const { correctedEmail } = req.body;

    const bouncedEmail = await BouncedEmail.findById(req.params.id);
    if (!bouncedEmail) {
      return res.status(404).json({ message: 'Bounced email record not found' });
    }

    const targetEmail = correctedEmail || bouncedEmail.studentEmail;

    // Find the QR code that was being sent
    let qrCodeToSend = null;
    if (bouncedEmail.qrCode) {
      qrCodeToSend = await QRCode.findById(bouncedEmail.qrCode).populate('event');
    }

    // If original QR code not found or already used, find an available one
    if (!qrCodeToSend || qrCodeToSend.isUsed || qrCodeToSend.emailSent) {
      qrCodeToSend = await QRCode.findOne({
        event: bouncedEmail.event,
        emailSent: { $ne: true },
        isUsed: false
      }).populate('event');
    }

    if (!qrCodeToSend) {
      return res.status(400).json({
        message: 'No available QR codes found for this event. Please generate more QR codes first.'
      });
    }

    // Create SES SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.AWS_SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
      port: parseInt(process.env.AWS_SES_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.AWS_SES_SMTP_USER,
        pass: process.env.AWS_SES_SMTP_PASS
      },
      connectionTimeout: 10000
    });

    // Generate QR code image
    const qrCodeDataUrl = await new Promise((resolve, reject) => {
      const qrDataString = JSON.stringify({
        id: qrCodeToSend.uniqueId,
        event: qrCodeToSend.event.name,
        course: qrCodeToSend.course,
        year: qrCodeToSend.year,
        mealType: qrCodeToSend.mealType
      });

      qrcode.toDataURL(qrDataString, { errorCorrectionLevel: 'H', width: 250 }, (err, url) => {
        if (err) reject(err);
        else resolve(url);
      });
    });

    // Send email
    const fromName = process.env.SES_FROM_NAME || 'DigiToken GEHU';
    const fromEmail = process.env.SES_FROM_EMAIL || 'digitokengehu@quickrollattendance.live';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: targetEmail,
      subject: `${bouncedEmail.eventName || 'Event'} - Your Entry QR Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a4a4a; text-align: center;">${bouncedEmail.eventName || 'Event'} - Entry QR Code</h2>
          <div style="text-align: center; margin: 20px 0;">
            <img src="cid:qrcode" alt="QR Code" style="max-width: 250px; border: 1px solid #e0e0e0; padding: 10px;">
          </div>
          <p>Dear ${bouncedEmail.studentName},</p>
          <p>Please find your entry QR code above. This QR code is valid for <strong>one-time use only</strong>.</p>
          <p>Once scanned, it will expire immediately and cannot be reused.</p>
          <p>Please do not share your code with anyone.</p>
          <p style="margin-top: 30px;">Warm regards,<br>DigiToken Team</p>
        </div>
      `,
      headers: {
        'X-SES-MESSAGE-TAGS': `event=${bouncedEmail.eventName || 'retry'},type=retry`,
        'X-Entity-Ref-ID': `retry-${bouncedEmail._id}`
      },
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrCodeDataUrl.split(';base64,').pop(),
          encoding: 'base64',
          cid: 'qrcode'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);

    // Update QR code
    qrCodeToSend.email = targetEmail;
    qrCodeToSend.emailSent = true;
    qrCodeToSend.emailSentAt = new Date();
    if (bouncedEmail.student) {
      qrCodeToSend.student = bouncedEmail.student;
    }
    await qrCodeToSend.save();

    // Update bounced email record
    bouncedEmail.status = 'retry_success';
    bouncedEmail.retryCount += 1;
    bouncedEmail.lastRetryAt = new Date();
    bouncedEmail.correctedEmail = correctedEmail || null;
    bouncedEmail.resolvedAt = new Date();
    bouncedEmail.resolvedBy = req.user._id;
    bouncedEmail.resolutionNotes = `Retry successful to ${targetEmail}. MessageId: ${info.messageId}`;
    await bouncedEmail.save();

    // If email was corrected, also update the student record
    if (correctedEmail && bouncedEmail.student) {
      await Student.findByIdAndUpdate(bouncedEmail.student, {
        email: correctedEmail.toLowerCase()
      });
    }

    res.status(200).json({
      message: `Email successfully re-sent to ${targetEmail}`,
      messageId: info.messageId,
      bouncedEmail
    });
  } catch (error) {
    console.error('Error in retryBouncedEmail:', error);

    // Update retry count on failure
    try {
      const bouncedEmail = await BouncedEmail.findById(req.params.id);
      if (bouncedEmail) {
        bouncedEmail.retryCount += 1;
        bouncedEmail.lastRetryAt = new Date();
        bouncedEmail.status = 'retry_failed';
        bouncedEmail.resolutionNotes = `Retry failed: ${error.message}`;
        await bouncedEmail.save();
      }
    } catch (updateError) {
      console.error('Error updating retry status:', updateError);
    }

    res.status(500).json({
      message: 'Failed to retry email',
      error: error.message,
      code: error.code
    });
  }
};

// @desc    Export bounced emails as CSV data
// @route   GET /api/bounced-emails/export
// @access  Private/Admin
const exportBouncedEmails = async (req, res) => {
  try {
    const { status, event } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (event) filter.event = event;

    const bouncedEmails = await BouncedEmail.find(filter)
      .sort({ createdAt: -1 })
      .populate('event', 'name');

    // Build CSV
    const csvHeaders = 'S.No,Student Name,Email,Course,Year,Roll Number,Event,Error,Bounce Type,Status,Date\n';
    const csvRows = bouncedEmails.map((record, index) => {
      return [
        index + 1,
        `"${record.studentName}"`,
        record.studentEmail,
        record.studentCourse,
        record.studentYear,
        record.studentRollNumber || '-',
        `"${record.eventName || '-'}"`,
        `"${record.errorMessage.replace(/"/g, '""')}"`,
        record.bounceType,
        record.status,
        new Date(record.createdAt).toLocaleString()
      ].join(',');
    }).join('\n');

    const csvContent = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=bounced-emails-${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error in exportBouncedEmails:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getBouncedEmails,
  getBouncedEmailStats,
  getBouncedEmailById,
  resolveBouncedEmail,
  bulkResolveBouncedEmails,
  deleteBouncedEmail,
  bulkDeleteBouncedEmails,
  retryBouncedEmail,
  exportBouncedEmails
};
