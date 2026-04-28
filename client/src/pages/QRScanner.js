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
  DialogActions
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  FlipCameraAndroid as FlipCameraIcon
} from '@mui/icons-material';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';

const QRScanner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [scannedResult, setScannedResult] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
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
    setVerificationResult(null);
    
    // Wait for the DOM to update and create the qr-reader element
    setTimeout(() => {
      // Check if the element exists
      const qrReaderElement = document.getElementById("qr-reader");
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
          "qr-reader",
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
          
          // Set scanned result
          setScannedResult(decodedText);
          
          // Verify QR code
          verifyQRCode(decodedText);
        };
        
        const onScanFailure = (error) => {
          // Handle scan failure if needed
          console.warn(`QR scan error: ${error}`);
        };
        
        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        setScanner(html5QrcodeScanner);
      } catch (error) {
        console.error("Error initializing QR scanner:", error);
        setAlert({
          open: true,
          message: `QR scanner initialization failed: ${error.message}`,
          severity: "error"
        });
        setScanning(false);
      }
    }, 100); // Small delay to ensure DOM is updated
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    setScanning(false);
  };

  const verifyQRCode = async (qrData) => {
    setLoading(true);
    
    try {
      // Call API to verify QR code
      const result = await api.verifyQRCode(qrData);
      
      // Set verification result
      setVerificationResult(result);
      
      // Show notification instead of dialog for continuous scanning
      setAlert({
        open: true,
        message: result.message,
        severity: result.isValid ? 'success' : 'error'
      });
      
      // Add to recent scans
      const newScan = {
        id: Math.random().toString(36).substring(2, 9),
        data: typeof qrData === 'string' ? JSON.parse(qrData) : qrData,
        timestamp: new Date().toISOString(),
        isValid: result.isValid,
        message: result.message
      };
      
      setRecentScans(prevScans => [newScan, ...prevScans.slice(0, 9)]);
      
      // Restart scanner immediately for continuous scanning
      startScanner();
      
    } catch (error) {
      console.error('Error verifying QR code:', error);
      setVerificationResult({
        isValid: false,
        message: error.message || 'Failed to verify QR code',
        error: error.message
      });
      
      // Show error notification instead of dialog
      setAlert({
        open: true,
        message: `Error: ${error.message || 'Failed to verify QR code'}`,
        severity: 'error'
      });
      
      // Restart scanner immediately for continuous scanning
      startScanner();
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setCurrentNotification(null);
    setAlert(prev => ({ ...prev, open: false }));
  };

  const handleReset = () => {
    setScannedResult(null);
    setVerificationResult(null);
    startScanner();
  };

  const handleFlipCamera = () => {
    // Toggle between front and back camera
    setCurrentCamera(prev => prev === 'environment' ? 'user' : 'environment');
    
    // Restart scanner with new camera
    if (scanner) {
      scanner.clear();
      setScanner(null);
    }
    
    // Small delay to ensure the previous scanner is cleared
    setTimeout(() => {
      startScanner();
    }, 500);
  };

  return (
    <Box sx={{ 
      flexGrow: 1, 
      transition: 'background-color 0.3s ease',
      backgroundColor: blinkEffect.color,
      minHeight: '100vh',
      padding: 3
    }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        QR Code Scanner
      </Typography>
      
      <Grid container spacing={3}>
        {/* QR Scanner */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              Scan QR Code
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ textAlign: 'center' }}>
              {!scanning && !scannedResult && (
                <Box sx={{ mb: 3 }}>
                  <QrCodeScannerIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" gutterBottom>
                    Click the button below to start scanning QR codes
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ mt: 2 }}
                    startIcon={<QrCodeScannerIcon />}
                    onClick={startScanner}
                  >
                    Start Scanner
                  </Button>
                </Box>
              )}
              
              {scanning && (
                <Box sx={{ mb: 3 }}>
                  <div id="qr-reader" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<FlipCameraIcon />}
                      onClick={handleFlipCamera}
                    >
                      Flip Camera
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={stopScanner}
                    >
                      Cancel Scanning
                    </Button>
                  </Box>
                </Box>
              )}
              
              {scannedResult && (
                <Box sx={{ mb: 3 }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      {verificationResult && (
                        <Box sx={{ 
                          mb: 3, 
                          p: 2, 
                          bgcolor: verificationResult.isValid ? 'success.light' : 'error.light',
                          color: 'white',
                          borderRadius: 1
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            {verificationResult.isValid ? (
                              <CheckCircleIcon sx={{ mr: 1 }} />
                            ) : (
                              <CancelIcon sx={{ mr: 1 }} />
                            )}
                            <Typography variant="h6">
                              {verificationResult.isValid ? 'Success' : 'Error'}
                            </Typography>
                          </Box>
                          <Typography variant="body1">
                            {verificationResult.message}
                          </Typography>
                        </Box>
                      )}
                      
                      <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={handleReset}
                      >
                        Scan Another QR Code
                      </Button>
                    </>
                  )}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
        
        {/* Recent Scans */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              Recent Scans
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
                  No recent scans
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
                              Event: {scan.data.event && typeof scan.data.event === 'object' ? scan.data.event.name : scan.data.event || 'Unknown Event'}
                            </Typography>
                            <Typography component="span" variant="body2" display="block">
                              Meal Type: {scan.data.mealType.charAt(0).toUpperCase() + scan.data.mealType.slice(1)}
                            </Typography>
                            <Typography component="span" variant="body2" display="block" color="text.secondary">
                              Scanned: {new Date(scan.timestamp).toLocaleTimeString()}
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
      
      {/* Removed success and error dialogs in favor of notifications */}
      
      <Snackbar
        key={currentNotification?.key}
        open={!!currentNotification}
        autoHideDuration={null}
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

export default QRScanner;
