import React, { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Divider, 
  Card, 
  CardContent, 
  CardActions, 
  Alert, 
  Snackbar, 
  CircularProgress,
  Chip,
  Stack
} from '@mui/material';
import {
  QrCode as QrCodeIcon,
  Email as EmailIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

const QRGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [events, setEvents] = useState([]);
  const [courses] = useState([
    'B.Tech', 'M.Tech', 'BBA', 'MBA', 'B.Sc', 'M.Sc', 'Ph.D'
  ]);
  const [years] = useState([
    '1', '2', '3', '4'
  ]);
  const [mealTypes] = useState([
    'veg', 'non-veg', 'any'
  ]);
  const [formData, setFormData] = useState({
    eventId: '',
    count: 50,
    course: '',
    year: '',
    mealType: 'any',
    email: ''
  });
  const [sending, setSending] = useState(false);
  const [generatedQRs, setGeneratedQRs] = useState([]);
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      
      try {
        // Fetch active events from the API
        const eventsData = await api.getEvents({ isActive: true });
        setEvents(eventsData);
      } catch (error) {
        console.error('Error fetching events:', error);
        setAlert({
          open: true,
          message: 'Failed to load events. Please try again later.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvents();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleGenerateQRCodes = async () => {
    // Validate form
    if (!formData.eventId || !formData.count || !formData.course || !formData.year) {
      setAlert({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    if (formData.count <= 0 || formData.count > 1000) {
      setAlert({
        open: true,
        message: 'Count must be between 1 and 1000',
        severity: 'error'
      });
      return;
    }

    setGenerating(true);

    try {
      // Prepare data for API call
      const qrData = {
        eventId: formData.eventId,
        count: formData.count, // Changed from quantity to count to match server expectations
        course: formData.course,
        year: formData.year,
        mealType: formData.mealType
      };
      
      // Call API to generate QR codes
      const response = await api.generateQRCodes(qrData);
      
      // The server returns { message, qrCodes } but we only need the qrCodes array
      setGeneratedQRs(response.qrCodes || []);
      setGenerating(false);
      
      setAlert({
        open: true,
        message: `Successfully generated ${formData.count} QR codes`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating QR codes:', error);
      setGenerating(false);
      setAlert({
        open: true,
        message: `Failed to generate QR codes: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleCloseAlert = () => {
    setAlert({
      ...alert,
      open: false
    });
  };

  const handleSendEmail = async () => {
    if (!formData.email) {
      setAlert({
        open: true,
        message: 'Please enter an email address',
        severity: 'error'
      });
      return;
    }
    
    setSending(true);
    
    try {
      // Call API to send QR codes via email
      await api.sendQRCodesByEmail({
        email: formData.email,
        qrCodeIds: generatedQRs.map(qr => qr._id)
      });
      
      setSending(false);
      
      setAlert({
        open: true,
        message: `QR codes sent to ${formData.email}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setSending(false);
      
      setAlert({
        open: true,
        message: `Failed to send email: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleDownloadQR = async (qrCode) => {
    try {
      // Call API to download a single QR code
      const response = await api.downloadQRCode(qrCode._id);
      
      // Create a download link for the QR code image
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `qr-code-${qrCode._id}.png`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setAlert({
        open: true,
        message: 'QR code downloaded successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setAlert({
        open: true,
        message: `Failed to download QR code: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleBulkDownload = async () => {
    try {
      // Call API to download all generated QR codes as a ZIP file
      const response = await api.downloadQRCodes(generatedQRs.map(qr => qr._id));
      
      // Create a download link for the ZIP file
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `qr-codes-${new Date().toISOString()}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setAlert({
        open: true,
        message: 'QR codes downloaded successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading QR codes:', error);
      setAlert({
        open: true,
        message: `Failed to download QR codes: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        QR Code Generator
      </Typography>
      
      <Grid container spacing={3}>
        {/* QR Generation Form */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              Generate QR Codes
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" noValidate sx={{ mt: 1 }}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="event-label">Event *</InputLabel>
                <Select
                  labelId="event-label"
                  id="eventId"
                  name="eventId"
                  value={formData.eventId}
                  onChange={handleInputChange}
                  label="Event *"
                  disabled={loading}
                >
                  {events.filter(event => event.isActive).map((event) => (
                    <MenuItem key={event._id} value={event._id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="course-label">Course *</InputLabel>
                <Select
                  labelId="course-label"
                  id="course"
                  name="course"
                  value={formData.course}
                  onChange={handleInputChange}
                  label="Course *"
                >
                  {courses.map((course) => (
                    <MenuItem key={course} value={course}>
                      {course}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="year-label">Year *</InputLabel>
                <Select
                  labelId="year-label"
                  id="year"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  label="Year *"
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="meal-type-label">Meal Type</InputLabel>
                <Select
                  labelId="meal-type-label"
                  id="mealType"
                  name="mealType"
                  value={formData.mealType}
                  onChange={handleInputChange}
                  label="Meal Type"
                >
                  {mealTypes.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                margin="normal"
                required
                fullWidth
                id="count"
                label="Number of QR Codes"
                name="count"
                type="number"
                value={formData.count}
                onChange={handleInputChange}
                inputProps={{ min: 1, max: 100 }}
              />
              
              <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Email for QR Codes (Optional)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                helperText="Enter email to send QR codes after generation"
              />
              
              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                onClick={handleGenerateQRCodes}
                disabled={generating || loading}
                startIcon={generating ? <CircularProgress size={20} /> : <QrCodeIcon />}
              >
                {generating ? 'Generating...' : 'Generate QR Codes'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* Generated QR Codes */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Generated QR Codes
              </Typography>
              
              {generatedQRs.length > 0 && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={sending ? <CircularProgress size={20} /> : <EmailIcon />}
                    onClick={handleSendEmail}
                    disabled={sending}
                  >
                    {sending ? 'Sending...' : 'Send All'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleBulkDownload}
                  >
                    Download All
                  </Button>
                </Stack>
              )}
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            {generatedQRs.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 8
              }}>
                <QrCodeIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No QR Codes Generated Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Fill out the form and click "Generate QR Codes" to create new QR codes
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {generatedQRs.map((qrCode) => (
                  <Grid item xs={12} sm={6} md={4} key={qrCode._id}>
                    <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                      <CardContent sx={{ textAlign: 'center', pb: 1 }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center', 
                          mb: 2,
                          p: 1,
                          border: '1px solid #e0e0e0',
                          borderRadius: 1
                        }}>
                          <QRCodeSVG 
                            value={qrCode.qrData} 
                            size={120} 
                            level="H"
                            includeMargin
                          />
                        </Box>
                        
                        <Typography variant="subtitle1" gutterBottom>
                          {qrCode.course} - {qrCode.year}
                        </Typography>
                        
                        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
                          <Chip 
                            label={qrCode.event?.name || 'Unknown Event'} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                          <Chip 
                            label={qrCode.mealType.charAt(0).toUpperCase() + qrCode.mealType.slice(1)} 
                            size="small" 
                            color="secondary" 
                            variant="outlined" 
                          />
                        </Stack>
                        
                        <Typography variant="caption" color="text.secondary" display="block">
                          ID: {qrCode.uniqueId.substring(0, 8)}...
                        </Typography>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                        <Button 
                          size="small" 
                          startIcon={<EmailIcon />}
                          onClick={() => handleSendEmail(qrCode)}
                        >
                          Email
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadQR(qrCode)}
                        >
                          Download
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default QRGenerator;
