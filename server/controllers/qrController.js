const QRCode = require('../models/QRCode');
const Event = require('../models/Event');
const BouncedEmail = require('../models/BouncedEmail');
const qrcode = require('qrcode');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// @desc    Generate QR codes based on course and year
// @route   POST /api/qr/generate
// @access  Private/Admin
const generateQRCodes = async (req, res) => {
  try {
    const { eventId, course, year, count, mealType } = req.body;

    if (!eventId || !course || !year || !count) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const generatedQRCodes = [];

    // Generate specified number of QR codes
    for (let i = 0; i < count; i++) {
      // Generate unique ID for QR code
      const uniqueId = crypto.randomBytes(16).toString('hex');

      // Create QR code data
      const qrData = {
        uniqueId,
        course,
        year,
        event: eventId,
        mealType: mealType || 'any',
        isUsed: false,
        createdAt: new Date()
      };

      // Generate QR code image
      const qrImageBuffer = await qrcode.toDataURL(JSON.stringify({
        id: uniqueId,
        event: event.name,
        course,
        year,
        mealType: mealType || 'any'
      }));

      // Save QR code to database
      const newQRCode = new QRCode({
        ...qrData,
        qrImageUrl: qrImageBuffer
      });

      await newQRCode.save();
      generatedQRCodes.push(newQRCode);
    }

    res.status(201).json({
      message: `Successfully generated ${count} QR codes`,
      qrCodes: generatedQRCodes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify QR code
// @route   POST /api/qr/verify
// @access  Private
const verifyQRCode = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }

    const { id } = parsedData;

    if (!id) {
      return res.status(400).json({ message: 'Invalid QR code data' });
    }

    // Find QR code in database
    const qrCode = await QRCode.findOne({ uniqueId: id }).populate('event');

    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found' });
    }

    // Check if QR code has already been used
    if (qrCode.isUsed) {
      return res.status(400).json({
        message: 'QR code has already been used',
        usedAt: qrCode.usedAt,
        isValid: false
      });
    }

    // Check if event is active
    if (!qrCode.event.isActive) {
      return res.status(400).json({
        message: 'This event is no longer active',
        isValid: false
      });
    }

    // Mark QR code as used
    qrCode.isUsed = true;
    qrCode.usedAt = new Date();
    await qrCode.save();

    // Prepare a simplified response with only the necessary data
    // This avoids sending complex objects directly to the client
    const simplifiedQRCode = {
      _id: qrCode._id,
      uniqueId: qrCode.uniqueId,
      course: qrCode.course,
      year: qrCode.year,
      mealType: qrCode.mealType,
      isUsed: qrCode.isUsed,
      usedAt: qrCode.usedAt,
      // Extract only needed event properties
      event: {
        name: qrCode.event.name,
        date: qrCode.event.date,
        venue: qrCode.event.venue
      }
    };

    res.status(200).json({
      message: 'QR code successfully verified',
      isValid: true,
      qrCode: simplifiedQRCode
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all QR codes
// @route   GET /api/qr
// @access  Private/Admin
const getAllQRCodes = async (req, res) => {
  try {
    const { eventId, course, year, isUsed } = req.query;

    // Build filter object
    const filter = {};

    if (eventId) filter.event = eventId;
    if (course) filter.course = course;
    if (year) filter.year = year;
    if (isUsed !== undefined) filter.isUsed = isUsed === 'true';

    const qrCodes = await QRCode.find(filter)
      .populate('event', 'name date venue')
      .sort({ createdAt: -1 });

    res.status(200).json(qrCodes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper: Sanitize a string to be a valid AWS SES message tag value.
// SES only allows: alphanumeric ASCII, '_', '-', '.', '@'
// Strips CRLF, spaces, and all other special characters.
const sanitizeSESTag = (value) => {
  if (!value) return 'unknown';
  return String(value)
    .replace(/[\r\n\t]/g, '_')   // CRLF/tab → underscore
    .replace(/[^a-zA-Z0-9_\-\.@]/g, '_') // any other disallowed char → underscore
    .substring(0, 128);           // SES tag value max length is 256, keep it short
};

// Helper function to validate AWS SES email configuration
const validateEmailConfig = () => {
  const smtpUser = process.env.AWS_SES_SMTP_USER;
  const smtpPass = process.env.AWS_SES_SMTP_PASS;
  const smtpHost = process.env.AWS_SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com';
  const fromEmail = process.env.SES_FROM_EMAIL;

  const issues = [];

  if (!smtpUser) {
    issues.push('AWS_SES_SMTP_USER environment variable is not set');
  }

  if (!smtpPass) {
    issues.push('AWS_SES_SMTP_PASS environment variable is not set');
  }

  if (!fromEmail) {
    issues.push('SES_FROM_EMAIL environment variable is not set');
  }

  return {
    isValid: issues.length === 0,
    issues,
    config: {
      host: smtpHost,
      user: smtpUser ? `${smtpUser.substring(0, 6)}...` : 'not set',
      from: fromEmail || 'not set',
      passwordSet: !!smtpPass
    }
  };
};

// Helper function to create AWS SES SMTP transporter
const createSESTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.AWS_SES_SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com',
    port: parseInt(process.env.AWS_SES_SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.AWS_SES_SMTP_USER,
      pass: process.env.AWS_SES_SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000
  });
};

// Helper function to detect bounce-type errors (invalid address, mailbox issues)
// These errors mean the email couldn't be delivered to THIS specific recipient
// but the SES service itself is fine — so we should continue sending to others.
const isBounceError = (error) => {
  // SMTP permanent failure response codes (5xx)
  const bounceSMTPCodes = [550, 551, 552, 553, 554];

  // AWS SES specific error codes for address-level failures
  const bounceErrorCodes = [
    'MessageRejected',         // SES rejected for recipient-level reason
    'InvalidParameterValue',   // Invalid email format
  ];

  // Check SMTP response code (most reliable indicator)
  if (error.responseCode && bounceSMTPCodes.includes(error.responseCode)) {
    return true;
  }

  // Check AWS/SES error code
  if (error.code && bounceErrorCodes.includes(error.code)) {
    return true;
  }

  // Check error message patterns for address-related failures
  const bouncePatterns = /invalid.*address|mailbox.*not.*found|user.*unknown|recipient.*rejected|address.*rejected|does.*not.*exist|no.*such.*user|undeliverable/i;
  if (error.message && bouncePatterns.test(error.message)) {
    return true;
  }

  return false;
};

// Helper function to classify bounce type from error
const classifyBounceType = (error) => {
  const msg = (error.message || '').toLowerCase();
  const code = error.responseCode;

  if (code === 550 || msg.includes('not found') || msg.includes('unknown user') || msg.includes('does not exist') || msg.includes('no such user')) {
    return 'invalid_address';
  }
  if (code === 552 || msg.includes('mailbox full') || msg.includes('over quota')) {
    return 'mailbox_full';
  }
  if (msg.includes('domain') || msg.includes('dns') || msg.includes('mx')) {
    return 'domain_error';
  }
  if (code === 554 || msg.includes('rejected') || msg.includes('spam') || msg.includes('blocked')) {
    return 'rejected';
  }
  return 'unknown';
};

// Helper function to log a bounced email to the database
const logBouncedEmail = async (data) => {
  try {
    const bouncedRecord = new BouncedEmail({
      student: data.studentId || null,
      studentName: data.studentName || 'Unknown',
      studentEmail: data.email,
      studentCourse: data.course || '',
      studentYear: data.year || '',
      studentRollNumber: data.rollNumber || '',
      event: data.eventId || null,
      eventName: data.eventName || '',
      qrCode: data.qrCodeId || null,
      errorMessage: data.error.message || 'Unknown error',
      errorCode: data.error.code || 'unknown',
      smtpResponseCode: data.error.responseCode || null,
      bounceType: classifyBounceType(data.error),
      batchId: data.batchId || null
    });

    await bouncedRecord.save();
    console.log(`📧 Bounced email logged: ${data.email} - ${data.error.message}`);
    return bouncedRecord;
  } catch (logError) {
    // Don't let logging failures affect the main process
    console.error('Failed to log bounced email to database:', logError.message);
    return null;
  }
};

// Helper function to process emails in batches
const processEmailBatches = async (qrCodeIds, emailMap, studentIds, email, batchSize = 5, studentMap = {}) => {
  const results = [];
  const totalEmails = qrCodeIds.length;
  const batches = Math.ceil(totalEmails / batchSize);

  // Generate unique batch ID for tracking this send operation
  const batchId = crypto.randomBytes(8).toString('hex');

  console.log(`Processing ${totalEmails} emails in ${batches} batches of ${batchSize} [batchId: ${batchId}]`);

  // Track bounce count for this batch
  let bounceCount = 0;

  // Create AWS SES SMTP transport
  const transporter = createSESTransporter();


  // Process emails in batches
  for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
    const batchStart = batchIndex * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, totalEmails);
    const batchQrCodeIds = qrCodeIds.slice(batchStart, batchEnd);

    console.log(`Processing batch ${batchIndex + 1}/${batches} with ${batchQrCodeIds.length} emails`);

    // Process each QR code in the current batch
    for (let i = 0; i < batchQrCodeIds.length; i++) {
      const qrCodeId = batchQrCodeIds[i];
      const qrCode = await QRCode.findById(qrCodeId).populate('event');

      // Double-check that this QR code hasn't been sent to another student
      // This is a safety measure in case QR codes were modified between the initial check and now
      if (studentIds && qrCode.emailSent === true && !email) {
        console.log(`Skipping QR code ${qrCodeId} as it has already been sent to a student`);
        results.push({
          qrCodeId: qrCodeId,
          success: false,
          message: 'QR code has already been sent to another student'
        });
        continue;
      }

      // Additional check to ensure the QR code exists and is valid
      if (qrCode && qrCode.emailSent === undefined) {
        console.log(`Warning: QR code ${qrCodeId} has undefined emailSent status. Treating as available.`);
      }

      if (!qrCode) {
        results.push({
          qrCodeId: qrCodeId,
          email: email || (studentIds && emailMap[studentIds[batchStart + i]]) || 'unknown',
          success: false,
          message: 'QR code not found'
        });
        continue;
      }

      // Determine the target email and student info
      let targetEmail;
      let studentId = null;
      let studentInfo = null;

      if (email) {
        // Single email for all QR codes
        targetEmail = email;
      } else if (studentIds) {
        // Each QR code goes to a specific student
        studentId = studentIds[batchStart + i];
        targetEmail = emailMap[studentId];
        studentInfo = studentMap[studentId];

        if (!targetEmail) {
          results.push({
            qrCodeId: qrCodeId,
            studentId,
            success: false,
            message: 'Student email not found'
          });
          continue;
        }
      } else {
        results.push({
          qrCodeId: qrCodeId,
          success: false,
          message: 'No target email specified'
        });
        continue;
      }

      try {
        // Use student name from the pre-fetched studentMap (avoids redundant DB queries)
        let studentName = 'Student';
        if (studentInfo && studentInfo.name) {
          studentName = studentInfo.name;
        } else if (targetEmail) {
          // Fallback: only query DB if studentMap doesn't have the info (e.g. single email mode)
          try {
            const Student = require('../models/Student');
            const student = await Student.findOne({ email: targetEmail });
            if (student && student.name) {
              studentName = student.name;
            }
          } catch (err) {
            console.error('Error fetching student by email:', err);
          }
        }

        // Generate QR code image
        const qrCodeDataUrl = await new Promise((resolve, reject) => {
          const qrDataString = JSON.stringify({
            id: qrCode.uniqueId,
            event: qrCode.event.name,
            course: qrCode.course,
            year: qrCode.year,
            mealType: qrCode.mealType
          });

          qrcode.toDataURL(qrDataString, { errorCorrectionLevel: 'H', width: 250 }, (err, url) => {
            if (err) reject(err);
            else resolve(url);
          });
        });

        // Prepare email content with SES-compliant headers
        const fromName = process.env.SES_FROM_NAME || 'DigiToken GEHU';
        const fromEmail = process.env.SES_FROM_EMAIL || 'digitokengehu@quickrollattendance.live';
        const mailOptions = {
          from: `"${fromName}" <${fromEmail}>`,
          to: targetEmail,
          subject: `[Access Granted] Eternia 2026 ✧ Code Ends, Connection Remains`,
          headers: {
            'X-SES-MESSAGE-TAGS': `event=eternia2026,batch=${batchId},type=qr-delivery`,
            'X-Entity-Ref-ID': `qr-${qrCode.uniqueId}`
          },
          html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #eef2f6; font-family: 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 40px 10px;">
        <tr>
          <td align="center">
            
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
              
              <tr>
                <td style="background-color: #0f111a; padding: 30px; border-bottom: 3px solid #6366f1;">
                  <div style="display: flex; gap: 6px; margin-bottom: 15px;">
                    <span style="display: inline-block; width: 10px; height: 10px; background: #ef4444; border-radius: 50%;"></span>
                    <span style="display: inline-block; width: 10px; height: 10px; background: #eab308; border-radius: 50%;"></span>
                    <span style="display: inline-block; width: 10px; height: 10px; background: #22c55e; border-radius: 50%;"></span>
                  </div>
                  <h1 style="color: #f8fafc; font-size: 24px; font-weight: 300; margin: 0; font-family: 'Courier New', Courier, monospace;">
                    <span style="color: #6366f1;">const</span> event = <span style="color: #22c55e;">"Eternia 2026"</span>;
                  </h1>
                  <p style="color: #94a3b8; font-size: 14px; margin: 10px 0 0 0; font-family: 'Courier New', Courier, monospace;">
                    > Initializing farewell sequence...<br>
                    > Code ends, connection remains.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 40px 30px 20px 30px;">
                  <h2 style="color: #1e293b; font-size: 22px; font-weight: 600; margin: 0;">Welcome, ${studentName}.</h2>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 15px 0 0 0;">
                    The compilation is complete. We are proud to invite you to <strong>Eternia 2026</strong>. Please find your secure access credentials below to ensure a seamless entry process.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding: 15px 30px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <tr>
                      <td align="center" style="padding: 30px;">
                        <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 15px 0;">Encrypted Access Token</p>
                        <img src="cid:qrcode" alt="QR Code" width="200" height="200" style="display: block; border-radius: 8px;">
                        <p style="color: #ef4444; font-size: 13px; font-weight: 600; margin: 20px 0 0 0;">
                          &#9888; SINGLE-USE CREDENTIAL
                        </p>
                        <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">
                          Token invalidates immediately upon scan. Do not share.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding: 30px;">
                  
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                    <tr>
                      <td width="24" valign="top" style="padding-top: 2px;">🪪</td>
                      <td style="padding-left: 10px;">
                        <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 5px 0;">Identity Verification</h3>
                        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">A physical college ID card or printed ERP ID is strictly mandatory. Digital formats will bypass verification and result in denied entry.</p>
                      </td>
                    </tr>
                  </table>

                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
                    <tr>
                      <td width="24" valign="top" style="padding-top: 2px;">🚪</td>
                      <td style="padding-left: 10px;">
                        <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 5px 0;">Access Nodes</h3>
                        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">
                          • <strong>Gate 1</strong> (Canteen) - 3rd Year Boys<br>
                          • <strong>Gate 2</strong> (Marina Gate) - 3rd Year Girls<br>
                          Post-verification, a Food Band will be issued. Keep it secured to interface with catering services.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td width="24" valign="top" style="padding-top: 2px;">🛡️</td>
                      <td style="padding-left: 10px;">
                        <h3 style="color: #0f172a; font-size: 16px; margin: 0 0 5px 0;">Security & Theme Protocol</h3>
                        <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0;">Strict zero-tolerance policy for intoxicants. Please adhere to the Ethnic Theme to maintain the integrity and respect of the environment.</p>
                      </td>
                    </tr>
                  </table>

                </td>
              </tr>

              <tr>
                <td align="center" style="background-color: #f1f5f9; padding: 25px; border-top: 1px solid #e2e8f0;">
                  <p style="color: #475569; font-size: 14px; font-weight: 500; margin: 0;">Looking forward to seeing you in your ethnic best.</p>
                  <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
                    Executing final module: <strong>Team Eternia 2026</strong>
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `,
          attachments: [
            {
              filename: 'qrcode.png',
              content: qrCodeDataUrl.split(';base64,').pop(),
              encoding: 'base64',
              cid: 'qrcode'
            }
          ]
        };


        //       const mailOptions = {
        //         from: `"${fromName}" <${fromEmail}>`,
        //         to: targetEmail,
        //         subject: `✨ Eternia 2026 - Your Exclusive Access Pass & Event Details`,
        //         headers: {
        //           'X-SES-MESSAGE-TAGS': `event=${sanitizeSESTag(qrCode.event?.name)},batch=${sanitizeSESTag(batchId)},type=qr-delivery`,
        //           'X-Entity-Ref-ID': `qr-${qrCode.uniqueId}`
        //         },
        //         html: `
        //   <!DOCTYPE html>
        //   <html lang="en">
        //   <head>
        //     <meta charset="UTF-8">
        //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
        //     <title>Eternia 2026 Access Pass</title>
        //   </head>
        //   <body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

        //     <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f6; padding: 30px 10px;">
        //       <tr>
        //         <td align="center">

        //           <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">

        //             <tr>
        //               <td align="center" style="background: linear-gradient(135deg, #0f172a 0%, #312e81 100%); padding: 50px 30px;">
        //                 <h1 style="color: #ffffff; font-size: 36px; font-weight: 800; margin: 0; letter-spacing: 2px;">ETERNIA 2026</h1>
        //                 <p style="color: #a5b4fc; font-size: 16px; font-weight: 500; margin: 15px 0 0 0; font-style: italic;">
        //                   &lt; Code ends, connection remains. /&gt;
        //                 </p>
        //               </td>
        //             </tr>

        //             <tr>
        //               <td style="padding: 40px 30px 20px 30px;">
        //                 <p style="color: #1e293b; font-size: 20px; font-weight: 600; margin: 0;">Hello ${studentName},</p>
        //                 <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 15px 0 0 0;">
        //                   Your journey has compiled successfully. We are absolutely thrilled to welcome you to <strong>Eternia 2026</strong>—your official farewell celebration. Please review your entry documentation below.
        //                 </p>
        //               </td>
        //             </tr>

        //             <tr>
        //               <td style="padding: 10px 30px;">
        //                 <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px;">
        //                   <tr>
        //                     <td align="center" style="padding: 30px;">
        //                       <h2 style="color: #0f172a; font-size: 22px; margin: 0 0 20px 0;">🎟️ Digital Access Pass</h2>
        //                       <img src="cid:qrcode" alt="QR Code" width="220" height="220" style="display: block; border: 10px solid #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        //                       <p style="color: #ef4444; font-size: 14px; font-weight: 600; margin: 20px 0 0 0;">
        //                         STRICTLY ONE-TIME USE ONLY
        //                       </p>
        //                       <p style="color: #64748b; font-size: 13px; margin: 8px 0 0 0;">
        //                         Do not share this code. It will expire immediately upon scanning.
        //                       </p>
        //                     </td>
        //                   </tr>
        //                 </table>
        //               </td>
        //             </tr>

        //             <tr>
        //               <td style="padding: 30px;">

        //                 <h3 style="color: #312e81; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🪪 Mandatory Identification</h3>
        //                 <ul style="color: #475569; font-size: 15px; line-height: 1.6; padding-left: 20px; margin: 0 0 25px 0;">
        //                   <li>Physical college ID card is <strong>strictly required</strong>.</li>
        //                   <li>If missing, a printed copy of your ERP ID card is mandatory.</li>
        //                   <li><em>Digital copies will NOT be accepted at the gates.</em></li>
        //                 </ul>

        //                 <h3 style="color: #312e81; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🚪 Entry & Logistics</h3>
        //                 <ul style="color: #475569; font-size: 15px; line-height: 1.6; padding-left: 20px; margin: 0 0 25px 0;">
        //                   <li><strong>Gate No. 1</strong> (Near College Canteen) - 3rd Year Boys</li>
        //                   <li><strong>Gate No. 2</strong> (Marina Gate) - 3rd Year Girls</li>
        //                   <li>Upon successful scan, you will receive a <strong>Food Band</strong>. Keep it on at all times to access catering services.</li>
        //                 </ul>

        //                 <h3 style="color: #312e81; font-size: 18px; margin: 0 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">⚠️ Event Protocol</h3>
        //                 <ul style="color: #475569; font-size: 15px; line-height: 1.6; padding-left: 20px; margin: 0 0 20px 0;">
        //                   <li><strong>Zero Tolerance:</strong> Strictly no alcohol or intoxicants. Misconduct will result in immediate denied entry by monitoring volunteers.</li>
        //                   <li><strong>Dress Code:</strong> The event has an <em>Ethnic Theme</em>. Please dress appropriately to ensure everyone feels respected and comfortable.</li>
        //                 </ul>

        //               </td>
        //             </tr>

        //             <tr>
        //               <td align="center" style="background-color: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
        //                 <p style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0;">We can't wait to see you there in your ethnic best! 🌸</p>
        //                 <p style="color: #64748b; font-size: 14px; margin: 20px 0 0 0;">
        //                   Warm regards,<br>
        //                   <strong>Team Eternia 2026</strong><br>
        //                   Farewell Organising Committee
        //                 </p>
        //               </td>
        //             </tr>

        //           </table>
        //         </td>
        //       </tr>
        //     </table>
        //   </body>
        //   </html>
        // `,
        //         attachments: [
        //           {
        //             filename: 'qrcode.png',
        //             content: qrCodeDataUrl.split(';base64,').pop(),
        //             encoding: 'base64',
        //             cid: 'qrcode'
        //           }
        //         ]
        //       };

        // const mailOptions = {
        //   from: `"${fromName}" <${fromEmail}>`,
        //   to: targetEmail,
        //   subject: `🎉 Nivriti 2025 - Farewell Entry Details & QR Code Access Pass`,
        //   headers: {
        //     'X-SES-MESSAGE-TAGS': `event=${qrCode.event.name},batch=${batchId},type=qr-delivery`,
        //     'X-Entity-Ref-ID': `qr-${qrCode.uniqueId}`
        //   },
        //   html: `
        //     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        //       <h2 style="color: #4a4a4a; text-align: center;">Nivriti 2025 - Farewell Celebration</h2>
        //       <div style="text-align: center; margin: 20px 0;">
        //         <img src="cid:qrcode" alt="QR Code" style="max-width: 250px; border: 1px solid #e0e0e0; padding: 10px;">
        //       </div>
        //       <p>Dear ${studentName},</p>
        //       <p>We're thrilled to welcome you all to Nivriti 2025 - Your Farewell Celebration! 🎊</p>
        //       <p>Please read the following instructions carefully to ensure smooth and secure entry to the event.</p>

        //       <h3 style="color: #5c6bc0;">📌 Entry QR Code</h3>
        //       <ul>
        //         <li>Your unique QR code is attached above.</li>
        //         <li>This QR code is valid for one-time use only.</li>
        //         <li>Once scanned, it will expire immediately and cannot be reused.</li>
        //         <li>Please do not share your code, as misuse can prevent you from entering the event.</li>
        //         <li>Entry data will be verified and managed by our IT Team, specially formed for this event.</li>
        //       </ul>

        //       <h3 style="color: #5c6bc0;">🪪 College ID Card is Mandatory</h3>
        //       <ul>
        //         <li>Please carry your physical college ID card with you.</li>
        //         <li>If you do not have a physical ID card, you must carry a printed copy of your ERP ID card.</li>
        //         <li>Digital copies will NOT be accepted under any circumstances.</li>
        //       </ul>

        //       <h3 style="color: #5c6bc0;">🚪 Entry Gates</h3>
        //       <ul>
        //         <li>Gate No. 1 (Near College Canteen Gate) - for 3rd Year Boys</li>
        //         <li>Gate No. 2 (Marina Gate) - for 3rd Year Girls</li>
        //       </ul>

        //       <h3 style="color: #5c6bc0;">🍽 Food Band</h3>
        //       <ul>
        //         <li>After your QR is scanned and your entry is approved, you will be issued a Food Band.</li>
        //         <li>Please keep it on throughout the event as it is required for availing food services.</li>
        //       </ul>

        //       <h3 style="color: #5c6bc0;">🚫 Important Guidelines</h3>
        //       <ul>
        //         <li>Strictly no alcohol or intoxicants before or during the event.</li>
        //         <li>Volunteers will be monitoring at the gates, and any misconduct will result in denied entry.</li>
        //         <li>The event has an ethnic theme, so kindly dress accordingly.</li>
        //         <li>Please avoid inappropriate or revealing clothing.</li>
        //         <li>This is to ensure that everyone feels safe, respected, and comfortable during the celebration.</li>
        //       </ul>

        //       <p>Let's make Nivriti 2025 a beautiful, heartwarming, and respectful memory for all of us.</p>
        //       <p>We're excited to see you there in your ethnic best! 🌸</p>

        //       <p>Warm regards,<br>
        //       Team Nivriti 2025<br>
        //       Farewell Organising Committee</p>
        //     </div>
        //   `,
        //   attachments: [
        //     {
        //       filename: 'qrcode.png',
        //       content: qrCodeDataUrl.split(';base64,').pop(),
        //       encoding: 'base64',
        //       cid: 'qrcode'
        //     }
        //   ]
        // };

        // Send the email
        console.log(`Attempting to send email to: ${targetEmail}`);
        const info = await transporter.sendMail(mailOptions);

        console.log('Email sent successfully:', {
          messageId: info.messageId,
          response: info.response
        });

        // Update QR code with email info
        qrCode.email = targetEmail;
        qrCode.emailSent = true;
        qrCode.emailSentAt = new Date();

        // If we're sending to a specific student, mark it as assigned to that student
        if (studentId) {
          qrCode.student = studentId;
          console.log(`QR code ${qrCode._id} assigned to student ${studentId} with email ${targetEmail}`);
        } else if (email) {
          // If we're sending to a single email (not tied to a student ID), log it
          console.log(`QR code ${qrCode._id} sent to general email ${targetEmail}`);
        }

        await qrCode.save();

        results.push({
          qrCodeId: qrCodeId,
          email: targetEmail,
          studentId: studentId || undefined,
          success: true,
          messageId: info.messageId
        });

        // Add a random delay between individual emails (1-2 seconds)
        if (i < batchQrCodeIds.length - 1) {
          const randomDelay = Math.floor(Math.random() * 1000) + 1000; // 1000-2000ms
          await new Promise(resolve => setTimeout(resolve, randomDelay));
        }
      } catch (error) {
        console.error('Email sending error:', {
          email: targetEmail,
          error: error.message,
          code: error.code,
          responseCode: error.responseCode
        });

        // Check if this is a bounce-type error (invalid address, mailbox issues)
        if (isBounceError(error)) {
          // BOUNCE: Log to database and CONTINUE to next email
          console.log(`📧 BOUNCE detected for ${targetEmail}: ${error.message} — logging and continuing...`);

          bounceCount++;

          // Log the bounced email to the database with full student context
          await logBouncedEmail({
            studentId: studentId || null,
            studentName: studentInfo?.name || 'Unknown',
            email: targetEmail,
            course: studentInfo?.course || qrCode.course || '',
            year: studentInfo?.year || qrCode.year || '',
            rollNumber: studentInfo?.rollNumber || '',
            eventId: qrCode.event?._id || null,
            eventName: qrCode.event?.name || '',
            qrCodeId: qrCode._id,
            error: error,
            batchId: batchId
          });

          results.push({
            qrCodeId: qrCodeId,
            email: targetEmail,
            studentId: studentId || undefined,
            success: false,
            bounced: true,
            message: error.message,
            errorCode: error.code || 'unknown',
            bounceType: classifyBounceType(error)
          });

          // DON'T stop — continue to next email
          continue;
        }

        // ANY OTHER ERROR: IMMEDIATELY STOP the entire email process
        console.log('⚠️ NON-BOUNCE ERROR DETECTED: Immediately stopping the entire email process');
        console.log(`Stopped after processing ${results.length} emails (${bounceCount} bounced). Error: ${error.message}`);

        results.push({
          qrCodeId: qrCodeId,
          email: targetEmail,
          studentId: studentId || undefined,
          success: false,
          bounced: false,
          message: error.message,
          errorCode: error.code || 'unknown'
        });

        // Return the results collected so far and exit the function
        return { results, bounceCount, stoppedEarly: true, stopReason: error.message };
      }
    }

    // Add a delay between batches to avoid rate limiting (7-10 seconds)
    if (batchIndex < batches - 1) {
      const randomDelay = Math.floor(Math.random() * 3000) + 7000; // 7000-10000ms
      console.log(`Batch ${batchIndex + 1}/${batches} complete. Pausing ${randomDelay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, randomDelay));
    }
  }

  console.log(`✅ Email batch complete. Sent: ${results.filter(r => r.success).length}, Bounced: ${bounceCount}, Total: ${results.length}`);
  return { results, bounceCount, stoppedEarly: false };
};

// @desc    Send QR codes via email
// @route   POST /api/qr/send-email
// @access  Private/Admin
const sendQRCodesByEmail = async (req, res) => {
  try {
    // Changed from const to let so we can reassign it later
    let { qrCodeIds, email, studentIds, batchSize } = req.body;
    const emailBatchSize = batchSize || 5; // Use client-provided batch size or default to 5

    // Check if we're sending to a single email or to students
    if (!qrCodeIds || (!email && !studentIds)) {
      return res.status(400).json({
        message: 'Please provide QR code IDs and either an email or student IDs'
      });
    }

    // If studentIds are provided, we'll fetch their emails and names
    let emailMap = {};
    let studentMap = {};
    if (studentIds) {
      const Student = require('../models/Student');
      const students = await Student.find({ _id: { $in: studentIds } });

      if (students.length === 0) {
        return res.status(404).json({ message: 'No students found with the provided IDs' });
      }

      // Create maps of student IDs to emails and names
      students.forEach(student => {
        const studentId = student._id.toString();
        emailMap[studentId] = student.email;
        studentMap[studentId] = {
          name: student.name,
          email: student.email,
          course: student.course,
          year: student.year,
          rollNumber: student.rollNumber
        };
      });
    }

    // Validate email configuration
    const emailValidation = validateEmailConfig();
    console.log('Email configuration validation:', emailValidation);

    // If there are configuration issues, log them but continue with the attempt
    if (!emailValidation.isValid) {
      console.warn('Email configuration issues detected:', emailValidation.issues);
    }

    console.log(`Starting email batch process for ${qrCodeIds.length} QR codes with batch size ${emailBatchSize}`);

    // Check if we're sending to specific students
    if (studentIds && studentIds.length > 0) {
      console.log(`Students to send to: ${studentIds.length}`);

      // If sending to students, we need to ensure each student gets a unique, unused QR code
      // First, check how many QR codes we need
      const neededQRCount = studentIds.length;

      // Find available QR codes (not yet sent to anyone)
      const availableQRs = await QRCode.find({ emailSent: { $ne: true } }).limit(neededQRCount);
      console.log(`Found ${availableQRs.length} available QR codes in the database`);

      // Check if we have enough available QR codes
      if (availableQRs.length < neededQRCount) {
        return res.status(400).json({
          message: `Not enough available QR codes. You need ${neededQRCount} QR codes but only ${availableQRs.length} are available.`,
          availableCount: availableQRs.length,
          requiredCount: neededQRCount
        });
      }

      // Use these available QR codes instead of the ones originally selected
      qrCodeIds = availableQRs.map(qr => qr._id.toString());
      console.log(`Using ${qrCodeIds.length} available QR codes for ${studentIds.length} students`);
    } else {
      // If sending to a single email (not to specific students), use the selected QR codes
      // Check if any of the selected QR codes have already been sent
      const qrCodes = await QRCode.find({ _id: { $in: qrCodeIds } });
      const alreadySentQRs = qrCodes.filter(qr => qr.emailSent === true);

      if (alreadySentQRs.length > 0) {
        console.log(`${alreadySentQRs.length} of the selected QR codes have already been sent`);
      }

      console.log(`Using ${qrCodes.length} selected QR codes to send to email: ${email}`);
    }

    // If sending to a single email (not to individual students), we can proceed
    // Process emails in batches using the helper function
    const batchResult = await processEmailBatches(qrCodeIds, emailMap, studentIds, email, emailBatchSize, studentMap);

    const { results, bounceCount, stoppedEarly, stopReason } = batchResult;

    // Build structured response with summary
    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success && !r.bounced).length;
    const bouncedStudents = results.filter(r => r.bounced).map(r => ({
      email: r.email,
      studentId: r.studentId,
      errorMessage: r.message,
      bounceType: r.bounceType
    }));

    res.status(200).json({
      message: stoppedEarly
        ? `Email sending stopped due to error after processing ${results.length} emails`
        : 'Email sending process completed',
      summary: {
        total: qrCodeIds.length,
        sent: sentCount,
        bounced: bounceCount,
        failed: failedCount,
        stoppedEarly: stoppedEarly,
        stopReason: stopReason || null
      },
      bouncedStudents,
      results
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Download QR codes as PDF
// @route   POST /api/qr/download
// @access  Private/Admin
const downloadQRCodes = async (req, res) => {
  try {
    const { qrCodeIds } = req.body;

    if (!qrCodeIds || !Array.isArray(qrCodeIds) || qrCodeIds.length === 0) {
      return res.status(400).json({ message: 'Please provide QR code IDs' });
    }

    // Fetch QR codes
    const qrCodes = await QRCode.find({ _id: { $in: qrCodeIds } }).populate('event');

    if (qrCodes.length === 0) {
      return res.status(404).json({ message: 'No QR codes found with the provided IDs' });
    }

    // Create a PDF document
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ autoFirstPage: false });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=qr-codes-${Date.now()}.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Flatten all QR codes into a single array for better pagination
    const allQrCodes = [];
    qrCodes.forEach(qrCode => {
      allQrCodes.push({
        qrCode,
        event: qrCode.event
      });
    });

    // Define layout constants
    const qrCodesPerPage = 6; // 2x3 grid
    const qrCodesPerRow = 2;
    const totalPages = Math.ceil(allQrCodes.length / qrCodesPerPage);

    // Process QR codes page by page
    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      // Add a new page
      doc.addPage({ size: 'A4', margin: 50 });

      // Get QR codes for this page
      const startIdx = pageNum * qrCodesPerPage;
      const endIdx = Math.min(startIdx + qrCodesPerPage, allQrCodes.length);
      const pageQrCodes = allQrCodes.slice(startIdx, endIdx);

      // Add page header
      doc.fontSize(16).text(`QR Codes - Page ${pageNum + 1} of ${totalPages}`, { align: 'center' });
      doc.moveDown(1);

      // Calculate grid layout
      const pageWidth = doc.page.width - 100; // Accounting for margins
      const pageHeight = doc.page.height - 150; // Accounting for margins and header
      const qrCodeWidth = pageWidth / qrCodesPerRow;
      const qrCodeHeight = pageHeight / 3; // 3 rows maximum

      // Add QR codes to the page
      for (let i = 0; i < pageQrCodes.length; i++) {
        const { qrCode, event } = pageQrCodes[i];
        const row = Math.floor(i / qrCodesPerRow);
        const col = i % qrCodesPerRow;

        // Calculate position
        const x = 50 + col * qrCodeWidth;
        const y = 100 + row * qrCodeHeight;

        // Draw a border around each QR code cell
        doc.rect(x, y, qrCodeWidth - 10, qrCodeHeight - 10).stroke();

        // Add event name
        doc.fontSize(10).text(`Event: ${event.name}`, x + 5, y + 5, { width: qrCodeWidth - 20 });

        // Add QR code image
        try {
          // Generate QR code on the fly if not available
          let imgBuffer;
          if (qrCode.qrImageUrl) {
            // Extract base64 data from data URL
            const base64Data = qrCode.qrImageUrl.split(',')[1];
            imgBuffer = Buffer.from(base64Data, 'base64');
          } else {
            // Generate QR code data
            const qrDataString = JSON.stringify({
              id: qrCode.uniqueId,
              event: event.name,
              course: qrCode.course,
              year: qrCode.year,
              mealType: qrCode.mealType
            });

            // Generate QR code image
            const qrCodeDataUrl = await new Promise((resolve, reject) => {
              qrcode.toDataURL(qrDataString, { errorCorrectionLevel: 'H', width: 200 }, (err, url) => {
                if (err) reject(err);
                else resolve(url);
              });
            });

            const base64Data = qrCodeDataUrl.split(',')[1];
            imgBuffer = Buffer.from(base64Data, 'base64');
          }

          // Add the image to the PDF
          const imageSize = qrCodeWidth - 40;
          const imageX = x + (qrCodeWidth - imageSize) / 2;
          const imageY = y + 25;
          doc.image(imgBuffer, imageX, imageY, { width: imageSize, height: imageSize });
        } catch (err) {
          console.error('Error generating QR code image:', err);
          doc.fontSize(12).text('QR Code Image Error', x + 20, y + 60, { width: qrCodeWidth - 40 });
        }

        // Add QR code details
        const detailsY = y + qrCodeHeight - 70;
        doc.fontSize(9).text(`ID: ${qrCode.uniqueId.substring(0, 8)}...`, x + 10, detailsY, { width: qrCodeWidth - 20 });
        doc.fontSize(9).text(`Course: ${qrCode.course}, Year: ${qrCode.year}`, x + 10, detailsY + 15, { width: qrCodeWidth - 20 });
        doc.fontSize(9).text(`Meal Type: ${qrCode.mealType}`, x + 10, detailsY + 30, { width: qrCodeWidth - 20 });
      }
    }

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('Error in downloadQRCodes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Download all QR codes for an event as PDF
// @route   GET /api/qr/download/:eventId
// @access  Private/Admin
const downloadEventQRCodes = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Fetch all QR codes for the event
    const qrCodes = await QRCode.find({ event: eventId });

    if (qrCodes.length === 0) {
      return res.status(404).json({ message: 'No QR codes found for this event' });
    }

    // Create a PDF document
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ autoFirstPage: false });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${event.name.replace(/\s+/g, '-')}-qr-codes.pdf`);

    // Pipe the PDF to the response
    doc.pipe(res);

    // Group QR codes by course and year
    const qrCodesByCourseYear = {};
    qrCodes.forEach(qrCode => {
      const key = `${qrCode.course}-${qrCode.year}`;
      if (!qrCodesByCourseYear[key]) {
        qrCodesByCourseYear[key] = [];
      }
      qrCodesByCourseYear[key].push(qrCode);
    });

    // Add a cover page
    doc.addPage({ size: 'A4', margin: 50 });
    doc.fontSize(24).text('QR Codes Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`Event: ${event.name}`, { align: 'center' });
    doc.fontSize(14).text(`Date: ${new Date(event.date).toLocaleDateString()}`, { align: 'center' });
    doc.fontSize(14).text(`Venue: ${event.venue}`, { align: 'center' });
    doc.fontSize(14).text(`Total QR Codes: ${qrCodes.length}`, { align: 'center' });
    doc.moveDown(2);

    // Add a table of contents
    doc.fontSize(16).text('Contents:', { underline: true });
    doc.moveDown(0.5);
    let pageNum = 2; // Start from page 2 (after cover)
    for (const key in qrCodesByCourseYear) {
      const [course, year] = key.split('-');
      const count = qrCodesByCourseYear[key].length;
      doc.fontSize(12).text(`${course} - Year ${year}: ${count} QR codes (Page ${pageNum})`);
      pageNum += Math.ceil(count / 6); // 6 QR codes per page
    }

    // Add QR codes to the PDF, grouped by course and year
    for (const key in qrCodesByCourseYear) {
      const [course, year] = key.split('-');
      const groupQRCodes = qrCodesByCourseYear[key];

      // Add a new page for each course-year group
      doc.addPage({ size: 'A4', margin: 50 });

      // Add group information
      doc.fontSize(18).text(`${course} - Year ${year}`, { align: 'center' });
      doc.fontSize(12).text(`Event: ${event.name}`, { align: 'center' });
      doc.fontSize(12).text(`Total QR Codes: ${groupQRCodes.length}`, { align: 'center' });
      doc.moveDown(2);

      // Calculate grid layout
      const qrCodesPerPage = 6; // 2x3 grid
      const qrCodesPerRow = 2;
      const pageWidth = doc.page.width - 100; // Accounting for margins
      const qrCodeWidth = pageWidth / qrCodesPerRow;
      const qrCodeHeight = qrCodeWidth;

      // Add QR codes to the page
      for (let i = 0; i < groupQRCodes.length; i++) {
        // Add a new page if needed
        if (i > 0 && i % qrCodesPerPage === 0) {
          doc.addPage({ size: 'A4', margin: 50 });
          doc.fontSize(18).text(`${course} - Year ${year} (continued)`, { align: 'center' });
          doc.moveDown(2);
        }

        const qrCode = groupQRCodes[i];
        const row = Math.floor((i % qrCodesPerPage) / qrCodesPerRow);
        const col = i % qrCodesPerRow;
        const x = 50 + col * qrCodeWidth;
        const y = 150 + row * qrCodeHeight;

        // Add QR code image
        if (qrCode.qrImageUrl) {
          // Extract base64 data from data URL
          const base64Data = qrCode.qrImageUrl.split(',')[1];
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, x, y, { width: qrCodeWidth - 20, height: qrCodeWidth - 20 });
        }

        // Add QR code details
        doc.fontSize(10).text(`ID: ${qrCode.uniqueId.substring(0, 8)}...`, x, y + qrCodeWidth - 15, { width: qrCodeWidth - 20 });
        doc.fontSize(10).text(`Meal Type: ${qrCode.mealType}`, x, y + qrCodeWidth, { width: qrCodeWidth - 20 });
        doc.fontSize(10).text(`Used: ${qrCode.isUsed ? 'Yes' : 'No'}`, x, y + qrCodeWidth + 15, { width: qrCodeWidth - 20 });
      }
    }

    // Finalize the PDF
    doc.end();

  } catch (error) {
    console.error('Error in downloadEventQRCodes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Test email configuration
// @route   POST /api/qr/test-email
// @access  Private/Admin
const testEmailConfig = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address for testing' });
    }

    // Validate email configuration
    const emailValidation = validateEmailConfig();
    console.log('Email configuration validation for test:', emailValidation);

    if (!emailValidation.isValid) {
      return res.status(400).json({
        message: 'Email configuration is incomplete',
        issues: emailValidation.issues
      });
    }

    // Create AWS SES SMTP transporter
    const transporter = createSESTransporter();

    // Verify the connection configuration
    const verificationResult = await new Promise((resolve) => {
      transporter.verify(function (error, success) {
        if (error) {
          console.error('Transporter verification error:', error);
          resolve({ success: false, error });
        } else {
          console.log('Server is ready to send emails');
          resolve({ success: true });
        }
      });
    });

    if (!verificationResult.success) {
      return res.status(500).json({
        message: 'Email configuration verification failed',
        error: verificationResult.error.message,
        code: verificationResult.error.code,
        issues: emailValidation.issues
      });
    }

    // Send a test email via AWS SES
    const fromName = process.env.SES_FROM_NAME || 'DigiToken GEHU';
    const fromAddr = process.env.SES_FROM_EMAIL || 'digitokengehu@quickrollattendance.live';

    const mailOptions = {
      from: `"${fromName}" <${fromAddr}>`,
      to: email,
      subject: 'DigiToken - AWS SES Email Test',
      headers: {
        'X-SES-MESSAGE-TAGS': 'type=test'
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4a4a4a; text-align: center;">DigiToken - AWS SES Email Test</h2>
          <p>This is a test email to verify that the AWS SES email configuration is working correctly.</p>
          <p>If you received this email, it means the SES SMTP configuration is working!</p>
          <p><strong>Region:</strong> ${process.env.AWS_SES_SMTP_HOST || 'ap-south-1'}</p>
          <p><strong>From:</strong> ${fromAddr}</p>
          <p><strong>Time sent:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: 'Test email sent successfully via AWS SES',
      details: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      },
      configuration: emailValidation.config
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      message: 'Failed to send test email via AWS SES',
      error: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode
    });
  }
};

// @desc    Admin validation of QR code without marking as used
// @route   POST /api/qr/admin-validate
// @access  Private/Admin
const validateQRCodeAdmin = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ message: 'QR data is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid QR code format' });
    }

    const { id } = parsedData;

    if (!id) {
      return res.status(400).json({ message: 'Invalid QR code data' });
    }

    // Find QR code in database
    const qrCode = await QRCode.findOne({ uniqueId: id }).populate('event').populate({
      path: 'student',
      select: 'name email course year' // Only select necessary fields
    });

    if (!qrCode) {
      return res.status(404).json({ message: 'QR code not found', isValid: false });
    }

    // Check QR code status without modifying it
    const qrStatus = {
      isValid: true,
      isUsed: qrCode.isUsed,
      usedAt: qrCode.usedAt || null,
      eventActive: qrCode.event && qrCode.event.isActive,
      emailSent: qrCode.emailSent || false,
      sentAt: qrCode.sentAt || null
    };

    // Add validation messages
    if (qrCode.isUsed) {
      qrStatus.message = 'QR code has already been used';
      qrStatus.isValid = false;
    } else if (!qrCode.event || !qrCode.event.isActive) {
      qrStatus.message = 'This event is no longer active';
      qrStatus.isValid = false;
    } else {
      qrStatus.message = 'QR code is valid and unused';
    }

    // Prepare a simplified response with only the necessary data
    const simplifiedQRCode = {
      _id: qrCode._id,
      uniqueId: qrCode.uniqueId,
      course: qrCode.course,
      year: qrCode.year,
      mealType: qrCode.mealType,
      isUsed: qrCode.isUsed,
      usedAt: qrCode.usedAt,
      emailSent: qrCode.emailSent || false,
      sentAt: qrCode.sentAt || null,
      // Include student info if available
      student: qrCode.student ? {
        name: qrCode.student.name,
        email: qrCode.student.email,
        course: qrCode.student.course,
        year: qrCode.student.year
      } : null,
      // Extract only needed event properties
      event: qrCode.event ? {
        name: qrCode.event.name,
        date: qrCode.event.date,
        venue: qrCode.event.venue,
        isActive: qrCode.event.isActive
      } : null
    };

    res.status(200).json({
      status: qrStatus,
      qrCode: simplifiedQRCode
    });
  } catch (error) {
    console.error('Admin QR validation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  generateQRCodes,
  verifyQRCode,
  getAllQRCodes,
  sendQRCodesByEmail,
  downloadQRCodes,
  downloadEventQRCodes,
  testEmailConfig,
  validateQRCodeAdmin
};
