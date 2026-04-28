import React, { useState, useEffect, useRef } from 'react';
import * as api from '../utils/api';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Card, 
  CardContent, 
  Divider, 
  Alert, 
  Snackbar, 
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FlipCameraAndroid as FlipCameraIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';

const AdminQRScanner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scannedResult, setScannedResult] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [currentCamera, setCurrentCamera] = useState('environment'); // Default to back camera
  const [blinkEffect, setBlinkEffect] = useState({
    active: false,
    color: 'transparent',
    count: 0
  });

  useEffect(() => {
    if (alert.open && alert.message) {
      setCurrentNotification({
        message: alert.message,
        severity: alert.severity,
        key: new Date().getTime()
      });
      
      // Start blinking effect based on alert severity
      const color = alert.severity === 'success' ? '#4caf50' : '#f44336';
      setBlinkEffect({
        active: true,
        color: color,
        count: 0
      });
    }
  }, [alert]);
  
  // Handle blinking effect
  useEffect(() => {
    if (blinkEffect.active && blinkEffect.count < 4) { // 3 blinks (on-off cycles)
      const timer = setTimeout(() => {
        setBlinkEffect(prev => ({
          ...prev,
          color: prev.color === 'transparent' ? 
                 (alert.severity === 'success' ? '#4caf50' : '#f44336') : 
                 'transparent',
          count: prev.count + 1
        }));
      }, 100); // 100ms per transition for a fast blink
      
      return () => clearTimeout(timer);
    } else if (blinkEffect.active) {
      // Reset after blinking completes
      setBlinkEffect({
        active: false,
        color: 'transparent',
        count: 0
      });
    }
  }, [blinkEffect, alert.severity]);

  useEffect(() => {
    return () => {
      // Clean up scanner on component unmount
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const startScanner = () => {
    setScanning(true);
    setScannedResult(null);
    setValidationResult(null);
    
    // Wait for the DOM to update and create the qr-reader element
    setTimeout(() => {
      // Check if the element exists
      const qrReaderElement = document.getElementById("admin-qr-reader");
      if (!qrReaderElement) {
        console.error("QR reader element not found");
        setAlert({
          open: true,
          message: "QR scanner initialization failed. Please try again.",
          severity: "error"
        });
        setScanning(false);
        return;
      }
      
      // Create and render the QR scanner
      try {
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "admin-qr-reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            defaultDeviceId: currentCamera === 'environment' ? { facingMode: { exact: "environment" } } : { facingMode: "user" }
          },
          false
        );
        
        const onScanSuccess = (decodedText, decodedResult) => {
          // Stop scanner after successful scan
          html5QrcodeScanner.clear();
          setScanner(null);
          setScanning(false);
          setScannedResult(decodedText);
          
          // Validate the QR code with admin validation endpoint
          validateQRCode(decodedText);
        };
        
        const onScanFailure = (error) => {
          // Handle scan failure silently - this happens continuously until a successful scan
          console.warn(`QR scan error: ${error}`);
        };
        
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        setScanner(html5QrcodeScanner);
      } catch (error) {
        console.error("Error starting scanner:", error);
        setAlert({
          open: true,
          message: `Failed to start scanner: ${error.message || 'Unknown error'}`,
          severity: "error"
        });
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setScanning(false);
  };

  const validateQRCode = async (qrData) => {
    setLoading(true);
    
    try {
      // Call the admin validation endpoint
      const result = await api.validateQRCodeAdmin(qrData);
      
      setValidationResult(result);
      
      // Add to recent scans
      const newScan = {
        id: new Date().getTime(),
        timestamp: new Date(),
        data: result.qrCode,
        isValid: result.status.isValid,
        status: result.status
      };
      
      setRecentScans(prev => [newScan, ...prev].slice(0, 10)); // Keep only last 10 scans
      
      // Show success or warning notification based on validity
      setAlert({
        open: true,
        message: result.status.message,
        severity: result.status.isValid ? 'success' : 'warning'
      });
      
    } catch (error) {
      console.error("QR validation error:", error);
      setAlert({
        open: true,
        message: `Validation failed: ${error.message || 'Unknown error'}`,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert({ ...alert, open: false });
    setCurrentNotification(null);
  };

  const handleReset = () => {
    setScannedResult(null);
    setValidationResult(null);
    startScanner();
  };

  const handleFlipCamera = () => {
    // Stop current scanner
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    
    // Toggle camera
    setCurrentCamera(prev => prev === 'environment' ? 'user' : 'environment');
    
    // Restart scanner with new camera after a short delay
    setTimeout(() => {
      startScanner();
    }, 500);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AdminIcon color="primary" />
        Admin QR Scanner
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Validate QR codes without marking them as used. This tool is for administrative purposes only.
      </Typography>
      
      <Grid container spacing={3}>
        {/* Scanner Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2 
            }}>
              <Typography variant="h6">
                QR Code Scanner
              </Typography>
              
              {scanning && (
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  startIcon={<FlipCameraIcon />}
                  onClick={handleFlipCamera}
                  size="small"
                >
                  Flip Camera
                </Button>
              )}
            </Box>
            
            {!scanning && !scannedResult && (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 8
              }}>
                <QrCodeScannerIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No QR code scanned yet
                </Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<QrCodeScannerIcon />}
                  onClick={startScanner}
                  sx={{ mt: 2 }}
                >
                  Start Scanner
                </Button>
              </Box>
            )}
            
            {scanning && (
              <Box sx={{ position: 'relative' }}>
                <Box 
                  id="admin-qr-reader" 
                  sx={{ 
                    width: '100%',
                    '& video': { borderRadius: 1 },
                    '& img': { display: 'none' }, // Hide the QR code image
                    border: `2px solid ${blinkEffect.color}`,
                    borderRadius: 1,
                    transition: 'border-color 0.1s ease-in-out'
                  }} 
                />
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  mt: 2 
                }}>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    startIcon={<CancelIcon />}
                    onClick={stopScanner}
                  >
                    Stop Scanner
                  </Button>
                </Box>
              </Box>
            )}
            
            {scannedResult && validationResult && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Validation Result
                </Typography>
                
                <Card 
                  variant="outlined" 
                  sx={{ 
                    mb: 2, 
                    borderColor: validationResult.status.isValid ? 'success.main' : 'error.main',
                    bgcolor: validationResult.status.isValid ? 'success.lighter' : 'error.lighter'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {validationResult.status.isValid ? (
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      ) : (
                        <CancelIcon color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="h6" component="div">
                        {validationResult.status.message}
                      </Typography>
                    </Box>
                    
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Property</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Value</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>QR ID</TableCell>
                            <TableCell>{validationResult.qrCode.uniqueId}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Course</TableCell>
                            <TableCell>{validationResult.qrCode.course}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Year</TableCell>
                            <TableCell>{validationResult.qrCode.year}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Meal Type</TableCell>
                            <TableCell>{validationResult.qrCode.mealType}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Used Status</TableCell>
                            <TableCell>
                              <Chip 
                                label={validationResult.qrCode.isUsed ? 'Used' : 'Not Used'} 
                                color={validationResult.qrCode.isUsed ? 'error' : 'success'} 
                                size="small" 
                              />
                            </TableCell>
                          </TableRow>
                          {validationResult.qrCode.isUsed && (
                            <TableRow>
                              <TableCell>Used At</TableCell>
                              <TableCell>
                                {new Date(validationResult.qrCode.usedAt).toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )}
                          <TableRow>
                            <TableCell>Email Status</TableCell>
                            <TableCell>
                              <Chip 
                                label={validationResult.qrCode.emailSent ? 'Sent' : 'Not Sent'} 
                                color={validationResult.qrCode.emailSent ? 'primary' : 'default'} 
                                size="small" 
                              />
                            </TableCell>
                          </TableRow>
                          {validationResult.qrCode.student && (
                            <>
                              <TableRow>
                                <TableCell>Student Name</TableCell>
                                <TableCell>{validationResult.qrCode.student.name}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Student Email</TableCell>
                                <TableCell>{validationResult.qrCode.student.email}</TableCell>
                              </TableRow>
                            </>
                          )}
                          {validationResult.qrCode.event && (
                            <>
                              <TableRow>
                                <TableCell>Event</TableCell>
                                <TableCell>{validationResult.qrCode.event.name}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Event Status</TableCell>
                                <TableCell>
                                  <Chip 
                                    label={validationResult.qrCode.event.isActive ? 'Active' : 'Inactive'} 
                                    color={validationResult.qrCode.event.isActive ? 'success' : 'default'} 
                                    size="small" 
                                  />
                                </TableCell>
                              </TableRow>
                            </>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<RefreshIcon />}
                        onClick={handleReset}
                      >
                        Scan Another QR Code
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Recent Scans Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Recent Validations
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {recentScans.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 8
              }}>
                <Typography variant="body1" color="text.secondary">
                  No recent validations
                </Typography>
              </Box>
            ) : (
              <List>
                {recentScans.map((scan) => (
                  <React.Fragment key={scan.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {scan.isValid ? (
                              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                            ) : (
                              <CancelIcon color="error" sx={{ mr: 1 }} />
                            )}
                            <Typography variant="subtitle1">
                              {scan.data.course} - {scan.data.year}
                            </Typography>
                            <Chip 
                              label={scan.isValid ? 'Valid' : 'Invalid'} 
                              color={scan.isValid ? 'success' : 'error'} 
                              size="small" 
                              sx={{ ml: 1 }} 
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {scan.status.message}
                            </Typography>
                            <Typography component="span" variant="body2" display="block">
                              ID: {scan.data.uniqueId.substring(0, 8)}...
                            </Typography>
                            <Typography component="span" variant="body2" display="block" color="text.secondary">
                              Validated: {new Date(scan.timestamp).toLocaleTimeString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      <Snackbar
        key={currentNotification?.key}
        open={!!currentNotification}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbar-root': {
            top: '24px',
          },
          '& .MuiPaper-root': {
            minWidth: '300px',
          },
        }}
      >
        <Alert 
          onClose={handleCloseAlert} 
          severity={currentNotification?.severity || 'info'}
          sx={{ 
            width: '100%',
            boxShadow: 3,
            '& .MuiAlert-icon': { fontSize: '1.5rem' },
            '& .MuiAlert-message': { fontSize: '1rem', fontWeight: 500 }
          }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleCloseAlert}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {currentNotification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminQRScanner;
