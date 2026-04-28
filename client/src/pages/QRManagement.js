import React, { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Tab,
  Tabs,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Email as EmailIcon,
  Download as DownloadIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';

const QRManagement = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [qrCodes, setQRCodes] = useState([]);
  const [filteredQRCodes, setFilteredQRCodes] = useState([]);
  const [events, setEvents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [years] = useState(['1','2','3','4']);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedQR, setSelectedQR] = useState(null);
  const [openQRDialog, setOpenQRDialog] = useState(false);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [filters, setFilters] = useState({
    eventId: '',
    course: '',
    year: '',
    isUsed: '',
    search: ''
  });
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Student email functionality
  const [openStudentDialog, setOpenStudentDialog] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentFilters, setStudentFilters] = useState({
    course: '',
    year: ''
  });
  const [tabValue, setTabValue] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [rangeSelection, setRangeSelection] = useState({
    start: '',
    end: ''
  });
  const [rangeError, setRangeError] = useState('');
  const [emailBatchSize, setEmailBatchSize] = useState(5); // Default batch size of 5
  
  const coursesList = ['B.Tech', 'M.Tech', 'BBA', 'MBA', 'B.Sc', 'M.Sc', 'Ph.D'];
  const yearsList = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch events from the API
        const eventsData = await api.getEvents();
        setEvents(eventsData);
        
        // Fetch QR codes
        const qrCodesData = await api.getAllQRCodes();
        setQRCodes(qrCodesData);
        setFilteredQRCodes(qrCodesData);
        
        // Extract unique courses and years from QR codes
        const uniqueCourses = [...new Set(qrCodesData.map(qr => qr.course))].sort();
        const uniqueYears = [...new Set(qrCodesData.map(qr => qr.year))].sort();
        
        setCourses(uniqueCourses);
        // setYears(uniqueYears);
      } catch (error) {
        console.error('Error fetching data:', error);
        setAlert({
          open: true,
          message: `Failed to fetch data: ${error.message || 'Unknown error'}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    // Apply filters
    let result = [...qrCodes];
    
    if (filters.eventId) {
      result = result.filter(qr => qr.event._id === filters.eventId);
    }
    
    if (filters.course) {
      result = result.filter(qr => qr.course === filters.course);
    }
    
    if (filters.year) {
      result = result.filter(qr => qr.year === filters.year);
    }
    
    if (filters.isUsed !== '') {
      const isUsed = filters.isUsed === 'true';
      result = result.filter(qr => qr.isUsed === isUsed);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(qr => 
        qr.uniqueId.toLowerCase().includes(searchLower) ||
        qr.course.toLowerCase().includes(searchLower) ||
        qr.year.toLowerCase().includes(searchLower) ||
        (qr.event && qr.event.name && qr.event.name.toLowerCase().includes(searchLower)) ||
        (qr.email && qr.email.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredQRCodes(result);
    setPage(0);
  }, [filters, qrCodes]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Helper function to apply filters to a single QR code
  const applyFilters = (qr, filterValues) => {
    // Check event filter
    if (filterValues.eventId && qr.event._id !== filterValues.eventId) {
      return false;
    }
    
    // Check course filter
    if (filterValues.course && qr.course !== filterValues.course) {
      return false;
    }
    
    // Check year filter
    if (filterValues.year && qr.year !== filterValues.year) {
      return false;
    }
    
    // Check used status filter
    if (filterValues.isUsed !== '') {
      const isUsed = filterValues.isUsed === 'true';
      if (qr.isUsed !== isUsed) {
        return false;
      }
    }
    
    // Check search filter
    if (filterValues.search) {
      const searchLower = filterValues.search.toLowerCase();
      return (
        qr.uniqueId.toLowerCase().includes(searchLower) ||
        qr.course.toLowerCase().includes(searchLower) ||
        qr.year.toLowerCase().includes(searchLower) ||
        (qr.event && qr.event.name && qr.event.name.toLowerCase().includes(searchLower)) ||
        (qr.email && qr.email.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  };

  const handleOpenFilterDialog = () => {
    setOpenFilterDialog(true);
  };

  const handleCloseFilterDialog = () => {
    setOpenFilterDialog(false);
  };

  const handleOpenQRDialog = (qrCode) => {
    setSelectedQR(qrCode);
    setOpenQRDialog(true);
  };

  const handleCloseQRDialog = () => {
    setOpenQRDialog(false);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const handleSearchChange = (e) => {
    setFilters({
      ...filters,
      search: e.target.value
    });
  };

  const handleResetFilters = () => {
    setFilters({
      eventId: '',
      course: '',
      year: '',
      isUsed: '',
      search: ''
    });
  };

  const handleSendEmail = async (qrCode) => {
    if (!qrCode.email) {
      setAlert({
        open: true,
        message: 'No email address associated with this QR code',
        severity: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Send email via API
      await api.sendQRCodesByEmail({
        qrCodeIds: [qrCode._id],
        email: qrCode.email
      });
      
      // Update QR code in local state
      const updatedQRCodes = qrCodes.map(qr => 
        qr._id === qrCode._id ? { ...qr, emailSent: true } : qr
      );
      
      setQRCodes(updatedQRCodes);
      setFilteredQRCodes(updatedQRCodes.filter(qr => applyFilters(qr, filters)));
      
      setAlert({
        open: true,
        message: 'QR code sent to email successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error sending email:', error);
      setAlert({
        open: true,
        message: `Failed to send email: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async (qrCode) => {
    try {
      setLoading(true);
      
      // Download QR code via API
      await api.downloadQRCode(qrCode._id);
      
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
    } finally {
      setLoading(false);
    }
  };

  const handleBulkEmail = async () => {
    // Get selected QR codes with email addresses
    const selectedQRsWithEmail = filteredQRCodes
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
      .filter(qr => qr.email);
    
    if (selectedQRsWithEmail.length === 0) {
      setAlert({
        open: true,
        message: 'No QR codes with email addresses found on this page',
        severity: 'warning'
      });
      return;
    }
    
    if (!window.confirm(`Are you sure you want to send emails to ${selectedQRsWithEmail.length} recipients?`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Group QR codes by email address
      const emailGroups = {};
      selectedQRsWithEmail.forEach(qr => {
        if (!emailGroups[qr.email]) {
          emailGroups[qr.email] = [];
        }
        emailGroups[qr.email].push(qr._id);
      });
      
      // Send emails for each group
      const emailPromises = Object.entries(emailGroups).map(([email, qrCodeIds]) => {
        return api.sendQRCodesByEmail({
          qrCodeIds,
          email
        });
      });
      
      await Promise.all(emailPromises);
      
      // Update QR codes in local state
      const updatedQRCodes = qrCodes.map(qr => {
        if (selectedQRsWithEmail.some(selected => selected._id === qr._id)) {
          return { ...qr, emailSent: true };
        }
        return qr;
      });
      
      setQRCodes(updatedQRCodes);
      setFilteredQRCodes(updatedQRCodes.filter(qr => applyFilters(qr, filters)));
      
      setAlert({
        open: true,
        message: `Successfully sent emails to ${Object.keys(emailGroups).length} recipients`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      setAlert({
        open: true,
        message: `Failed to send emails: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDownload = async () => {
    // Get QR codes on the current page
    const selectedQRs = filteredQRCodes
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    if (selectedQRs.length === 0) {
      setAlert({
        open: true,
        message: 'No QR codes found on this page',
        severity: 'warning'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Download QR codes via API
      await api.downloadQRCodes(selectedQRs.map(qr => qr._id));
      
      setAlert({
        open: true,
        message: `Successfully downloaded ${selectedQRs.length} QR codes`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading QR codes:', error);
      setAlert({
        open: true,
        message: `Failed to download QR codes: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Student-based email functionality
  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const data = await api.getStudentsByFilter(studentFilters);
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setAlert({
        open: true,
        message: `Failed to fetch students: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleOpenStudentDialog = () => {
    setOpenStudentDialog(true);
    setTabValue(0);
    setSelectedStudents([]);
    // Reset range selection
    setRangeSelection({
      start: '',
      end: ''
    });
    setRangeError('');
    // Set initial student filters from the current QR filters
    setStudentFilters({
      course: filters.course || '',
      year: filters.year || ''
    });
    fetchStudents();
  };

  const handleCloseStudentDialog = () => {
    setOpenStudentDialog(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleStudentFilterChange = (e) => {
    const { name, value } = e.target;
    setStudentFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyStudentFilters = () => {
    fetchStudents();
  };

  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(student => student._id));
    }
  };
  
  const handleSelectByRange = () => {
    // Convert to numbers
    const start = parseInt(rangeSelection.start, 10);
    const end = parseInt(rangeSelection.end, 10);
    
    // Validate range
    if (isNaN(start) || isNaN(end)) {
      setRangeError('Please enter valid numbers for start and end');
      return;
    }
    
    if (start <= 0 || end <= 0) {
      setRangeError('Serial numbers must be positive');
      return;
    }
    
    if (start > end) {
      setRangeError('Start serial number must be less than or equal to end serial number');
      return;
    }
    
    if (start > students.length || end > students.length) {
      setRangeError(`Serial numbers must be between 1 and ${students.length}`);
      return;
    }
    
    // Select students in the range
    const studentsInRange = students.slice(start - 1, end);
    const studentIdsInRange = studentsInRange.map(student => student._id);
    
    // Update selected students
    setSelectedStudents(prevSelected => {
      // Create a new Set with current selections
      const selectedSet = new Set(prevSelected);
      
      // Add all students in range
      studentIdsInRange.forEach(id => selectedSet.add(id));
      
      // Convert back to array
      return Array.from(selectedSet);
    });
    
    // Clear range selection
    setRangeSelection({ start: '', end: '' });
    
    // Show success message
    setAlert({
      open: true,
      message: `Selected ${studentsInRange.length} students from serial number ${start} to ${end}`,
      severity: 'success'
    });
  };

  const handleSendToStudents = async () => {
    if (selectedStudents.length === 0) {
      setAlert({
        open: true,
        message: 'Please select at least one student',
        severity: 'warning'
      });
      return;
    }

    // Get unused QR codes that match the student filters
    const matchingQRCodes = qrCodes.filter(qr => 
      !qr.isUsed && 
      (!studentFilters.course || qr.course === studentFilters.course) &&
      (!studentFilters.year || qr.year === studentFilters.year)
    );

    if (matchingQRCodes.length < selectedStudents.length) {
      setAlert({
        open: true,
        message: `Not enough unused QR codes available. Need ${selectedStudents.length} but only have ${matchingQRCodes.length}.`,
        severity: 'error'
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to send QR codes to ${selectedStudents.length} students?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Assign QR codes to students (one per student)
      const qrCodeIds = matchingQRCodes.slice(0, selectedStudents.length).map(qr => qr._id);
      
      // Send emails via API with batch size
      await api.sendQRCodesByEmail({
        qrCodeIds,
        studentIds: selectedStudents,
        batchSize: emailBatchSize // Use the configured batch size
      });
      
      console.log(`Sending ${selectedStudents.length} emails with batch size ${emailBatchSize}`);
      
      // Update QR codes in local state
      const updatedQRCodes = qrCodes.map(qr => {
        if (qrCodeIds.includes(qr._id)) {
          return { ...qr, emailSent: true };
        }
        return qr;
      });
      
      setQRCodes(updatedQRCodes);
      setFilteredQRCodes(updatedQRCodes.filter(qr => applyFilters(qr, filters)));
      
      setAlert({
        open: true,
        message: `Successfully sent QR codes to ${selectedStudents.length} students`,
        severity: 'success'
      });
      
      setOpenStudentDialog(false);
    } catch (error) {
      console.error('Error sending QR codes to students:', error);
      setAlert({
        open: true,
        message: `Failed to send QR codes: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQR = (qrCode) => {
    // In a real app, this would delete the QR code
    // For now, we'll just remove it from the local state
    setQRCodes(qrCodes.filter(qr => qr._id !== qrCode._id));
    
    setAlert({
      open: true,
      message: 'QR code deleted successfully',
      severity: 'success'
    });
  };

  const handleCloseAlert = () => {
    setAlert({
      ...alert,
      open: false
    });
  };
  
  // Test email functionality
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [openTestEmailDialog, setOpenTestEmailDialog] = useState(false);
  
  const handleOpenTestEmailDialog = () => {
    setOpenTestEmailDialog(true);
    setTestEmailAddress('');
  };
  
  const handleCloseTestEmailDialog = () => {
    setOpenTestEmailDialog(false);
  };
  
  const handleTestEmailChange = (e) => {
    setTestEmailAddress(e.target.value);
  };
  
  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      setAlert({
        open: true,
        message: 'Please enter an email address for testing',
        severity: 'warning'
      });
      return;
    }
    
    setTestingEmail(true);
    
    try {
      const result = await api.testEmailConfig(testEmailAddress);
      
      setAlert({
        open: true,
        message: `Test email sent successfully to ${testEmailAddress}. Check your inbox and spam folder.`,
        severity: 'success'
      });
      
      console.log('Email test result:', result);
      setOpenTestEmailDialog(false);
    } catch (error) {
      console.error('Email test error:', error);
      
      setAlert({
        open: true,
        message: `Failed to send test email: ${error.message || 'Unknown error'}. ${error.code ? `Error code: ${error.code}` : ''} ${error.issues ? `Issues: ${error.issues.join(', ')}` : ''}`,
        severity: 'error'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const getStatusChip = (qrCode) => {
    if (qrCode.isUsed) {
      return (
        <Chip 
          icon={<CheckCircleIcon />}
          label="Used" 
          color="success" 
          size="small" 
          variant="outlined"
        />
      );
    } else {
      return (
        <Chip 
          icon={<CancelIcon />}
          label="Unused" 
          color="warning" 
          size="small" 
          variant="outlined"
        />
      );
    }
  };

  const getEmailStatusChip = (qrCode) => {
    if (!qrCode.email) {
      return (
        <Chip 
          label="No Email" 
          color="default" 
          size="small" 
          variant="outlined"
        />
      );
    } else if (qrCode.emailSent) {
      return (
        <Chip 
          label="Sent" 
          color="success" 
          size="small" 
          variant="outlined"
        />
      );
    } else {
      return (
        <Chip 
          label="Not Sent" 
          color="error" 
          size="small" 
          variant="outlined"
        />
      );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        QR Code Management
      </Typography>
      
      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search by ID, course, year, event, or email"
              variant="outlined"
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<FilterListIcon />}
                onClick={handleOpenFilterDialog}
                sx={{ flexGrow: 1 }}
              >
                Filters
              </Button>
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<EmailIcon />}
                  onClick={handleBulkEmail}
                  sx={{ mr: 1 }}
                >
                  Send Emails (Page)
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PersonIcon />}
                  onClick={handleOpenStudentDialog}
                  sx={{ mr: 1 }}
                  color="secondary"
                >
                  Send to Students
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleBulkDownload}
                  sx={{ mr: 1 }}
                >
                  Download QR Codes
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={handleOpenTestEmailDialog}
                  color="info"
                  size="small"
                >
                  Test Email Config
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
        
        {/* Active Filters */}
        {(filters.eventId || filters.course || filters.year || filters.isUsed !== '' || filters.search) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {filters.eventId && (
                <Chip 
                  label={`Event: ${events.find(e => e._id === filters.eventId)?.name}`} 
                  onDelete={() => setFilters({ ...filters, eventId: '' })}
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
              
              {filters.course && (
                <Chip 
                  label={`Course: ${filters.course}`} 
                  onDelete={() => setFilters({ ...filters, course: '' })}
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
              
              {filters.year && (
                <Chip 
                  label={`Year: ${filters.year}`} 
                  onDelete={() => setFilters({ ...filters, year: '' })}
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
              
              {filters.isUsed !== '' && (
                <Chip 
                  label={`Status: ${filters.isUsed === 'true' ? 'Used' : 'Unused'}`} 
                  onDelete={() => setFilters({ ...filters, isUsed: '' })}
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
              
              {filters.search && (
                <Chip 
                  label={`Search: ${filters.search}`} 
                  onDelete={() => setFilters({ ...filters, search: '' })}
                  size="small"
                  sx={{ mb: 1 }}
                />
              )}
              
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleResetFilters}
                sx={{ mb: 1 }}
              >
                Reset All
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
      
      {/* QR Codes Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader aria-label="QR codes table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Course & Year</TableCell>
                <TableCell>Meal Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Email Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQRCodes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((qrCode) => (
                  <TableRow hover key={qrCode._id}>
                    <TableCell 
                      component="th" 
                      scope="row"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleOpenQRDialog(qrCode)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <QrCodeIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        {qrCode.uniqueId.substring(0, 8)}...
                      </Box>
                    </TableCell>
                    <TableCell>{qrCode.event?.name || 'Unknown Event'}</TableCell>
                    <TableCell>{qrCode.course} - {qrCode.year}</TableCell>
                    <TableCell>{qrCode.mealType.charAt(0).toUpperCase() + qrCode.mealType.slice(1)}</TableCell>
                    <TableCell>{getStatusChip(qrCode)}</TableCell>
                    <TableCell>{getEmailStatusChip(qrCode)}</TableCell>
                    <TableCell>{new Date(qrCode.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleOpenQRDialog(qrCode)}
                        title="View QR Code"
                      >
                        <QrCodeIcon fontSize="small" />
                      </IconButton>
                      
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleSendEmail(qrCode)}
                        title="Send Email"
                        disabled={!qrCode.email}
                      >
                        <EmailIcon fontSize="small" />
                      </IconButton>
                      
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleDownloadQR(qrCode)}
                        title="Download QR"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                      
                      {isAdmin() && (
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteQR(qrCode)}
                          title="Delete QR"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              
              {filteredQRCodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="text.secondary">
                      No QR codes found matching the filters
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredQRCodes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Filter Dialog */}
      <Dialog 
        open={openFilterDialog} 
        onClose={handleCloseFilterDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Filter QR Codes
          <IconButton
            aria-label="close"
            onClick={handleCloseFilterDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="event-filter-label">Event</InputLabel>
                <Select
                  labelId="event-filter-label"
                  id="eventId"
                  name="eventId"
                  value={filters.eventId}
                  onChange={handleFilterChange}
                  label="Event"
                >
                  <MenuItem value="">All Events</MenuItem>
                  {events.map((event) => (
                    <MenuItem key={event._id} value={event._id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="course-filter-label">Course</InputLabel>
                <Select
                  labelId="course-filter-label"
                  id="course"
                  name="course"
                  value={filters.course}
                  onChange={handleFilterChange}
                  label="Course"
                >
                  <MenuItem value="">All Courses</MenuItem>
                  {courses.map((course) => (
                    <MenuItem key={course} value={course}>
                      {course}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="year-filter-label">Year</InputLabel>
                <Select
                  labelId="year-filter-label"
                  id="year"
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  label="Year"
                >
                  <MenuItem value="">All Years</MenuItem>
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  id="isUsed"
                  name="isUsed"
                  value={filters.isUsed}
                  onChange={handleFilterChange}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">Used</MenuItem>
                  <MenuItem value="false">Unused</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetFilters} startIcon={<RefreshIcon />}>
            Reset Filters
          </Button>
          <Button onClick={handleCloseFilterDialog} variant="contained">
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* QR Code Dialog */}
      <Dialog 
        open={openQRDialog} 
        onClose={handleCloseQRDialog}
        maxWidth="sm"
        fullWidth
      >
        {selectedQR && (
          <>
            <DialogTitle>
              QR Code Details
              <IconButton
                aria-label="close"
                onClick={handleCloseQRDialog}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box sx={{ 
                  display: 'inline-block', 
                  p: 2, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 1,
                  bgcolor: 'background.paper'
                }}>
                  <QRCodeSVG 
                    value={selectedQR.qrData} 
                    size={200} 
                    level="H"
                    includeMargin
                  />
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    ID
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedQR.uniqueId}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {getStatusChip(selectedQR)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Event
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedQR.event?.name || 'Unknown Event'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Course & Year
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedQR.course} - {selectedQR.year}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Meal Type
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedQR.mealType.charAt(0).toUpperCase() + selectedQR.mealType.slice(1)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created At
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedQR.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
                
                {selectedQR.isUsed && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Used At
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {new Date(selectedQR.usedAt).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedQR.email || 'Not assigned'}
                  </Typography>
                </Grid>
                
                {selectedQR.email && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Email Status
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {getEmailStatusChip(selectedQR)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => handleSendEmail(selectedQR)} 
                startIcon={<EmailIcon />}
                disabled={!selectedQR.email}
              >
                Send Email
              </Button>
              <Button 
                onClick={() => handleDownloadQR(selectedQR)} 
                startIcon={<DownloadIcon />}
              >
                Download
              </Button>
              {isAdmin() && (
                <Button 
                  onClick={() => {
                    handleDeleteQR(selectedQR);
                    handleCloseQRDialog();
                  }} 
                  color="error"
                  startIcon={<DeleteIcon />}
                >
                  Delete
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
      
      {/* Student Selection Dialog */}
      <Dialog
        open={openStudentDialog}
        onClose={handleCloseStudentDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Send QR Codes to Students</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Select Students" />
              <Tab label="Preview" />
            </Tabs>
          </Box>
          
          {tabValue === 0 && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Course</InputLabel>
                    <Select
                      name="course"
                      value={studentFilters.course}
                      onChange={handleStudentFilterChange}
                      label="Course"
                    >
                      <MenuItem value="">All Courses</MenuItem>
                      {courses.map(course => (
                        <MenuItem key={course} value={course}>{course}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Year</InputLabel>
                    <Select
                      name="year"
                      value={studentFilters.year}
                      onChange={handleStudentFilterChange}
                      label="Year"
                    >
                      <MenuItem value="">All Years</MenuItem>
                      {years.map(year => (
                        <MenuItem key={year} value={year}>{year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button 
                    variant="outlined" 
                    onClick={handleApplyStudentFilters}
                    fullWidth
                    sx={{ height: '100%' }}
                  >
                    Apply
                  </Button>
                </Grid>
              </Grid>
              
              {/* Range Selection */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Select Students by Serial Number Range
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="Start Serial Number"
                      type="number"
                      fullWidth
                      size="small"
                      value={rangeSelection.start}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRangeSelection(prev => ({ ...prev, start: value }));
                        setRangeError('');
                      }}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      label="End Serial Number"
                      type="number"
                      fullWidth
                      size="small"
                      value={rangeSelection.end}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRangeSelection(prev => ({ ...prev, end: value }));
                        setRangeError('');
                      }}
                      InputProps={{ inputProps: { min: 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handleSelectByRange}
                      disabled={!rangeSelection.start || !rangeSelection.end}
                    >
                      Select Range
                    </Button>
                  </Grid>
                  {rangeError && (
                    <Grid item xs={12}>
                      <Typography color="error" variant="caption">
                        {rangeError}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Students ({students.length})
                </Typography>
                <Button
                  variant="text"
                  onClick={handleSelectAllStudents}
                  size="small"
                  sx={{ mb: 1 }}
                >
                  {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>
              
              {loadingStudents ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : students.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                  <Typography variant="body1" color="text.secondary">
                    No students found matching the selected filters.
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={selectedStudents.length > 0 && selectedStudents.length < students.length}
                            checked={students.length > 0 && selectedStudents.length === students.length}
                            onChange={handleSelectAllStudents}
                          />
                        </TableCell>
                        <TableCell width={80} align="center"><strong>S.No</strong></TableCell>
                        <TableCell><strong>Name</strong></TableCell>
                        <TableCell><strong>Email</strong></TableCell>
                        <TableCell><strong>Course</strong></TableCell>
                        <TableCell><strong>Year</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((student, index) => (
                        <TableRow 
                          key={student._id} 
                          hover
                          selected={selectedStudents.includes(student._id)}
                          onClick={() => handleToggleStudent(student._id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedStudents.includes(student._id)}
                              onChange={() => handleToggleStudent(student._id)}
                            />
                          </TableCell>
                          <TableCell align="center">{index + 1}</TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.course}</TableCell>
                          <TableCell>{student.year}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
          
          {tabValue === 1 && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Students: {selectedStudents.length}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Each student will receive one QR code matching their course and year.
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Summary
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Selected Students:</strong> {selectedStudents.length}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Available QR Codes:</strong> {qrCodes.filter(qr => 
                          !qr.isUsed && 
                          (!studentFilters.course || qr.course === studentFilters.course) &&
                          (!studentFilters.year || qr.year === studentFilters.year)
                        ).length}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          <strong>Email Batch Size:</strong>
                        </Typography>
                        <TextField
                          type="number"
                          size="small"
                          value={emailBatchSize}
                          onChange={(e) => setEmailBatchSize(Math.max(1, parseInt(e.target.value) || 5))}
                          InputProps={{
                            inputProps: { min: 1, max: 100 },
                            endAdornment: (
                              <InputAdornment position="end">
                                <Typography variant="caption" color="text.secondary">
                                  emails/batch
                                </Typography>
                              </InputAdornment>
                            ),
                          }}
                          helperText="Number of emails to send in each batch"
                          fullWidth
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        QR Code Assignment
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Course:</strong> {studentFilters.course || 'Any'}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Year:</strong> {studentFilters.year || 'Any'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Available QR Codes:</strong> {qrCodes.filter(qr => 
                          !qr.isUsed && 
                          (!studentFilters.course || qr.course === studentFilters.course) &&
                          (!studentFilters.year || qr.year === studentFilters.year)
                        ).length}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Email Preview
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>Subject:</strong> Your Food Token
                      </Typography>
                      <Typography variant="body2" paragraph>
                        <strong>From:</strong> DigiToken System
                      </Typography>
                      <Typography variant="body2">
                        <strong>Content:</strong> Includes personalized QR code and event details
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStudentDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSendToStudents}
            disabled={selectedStudents.length === 0 || loading}
            startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            Send QR Codes
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Test Email Dialog */}
      <Dialog
        open={openTestEmailDialog}
        onClose={handleCloseTestEmailDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Test Email Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              This will send a test email to verify that your email configuration is working correctly.
              If you're having issues with emails not being delivered, use this to diagnose the problem.
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>Common issues:</strong>
              <ul>
                <li>Gmail requires an App Password if you have 2FA enabled</li>
                <li>Check that EMAIL_USER, EMAIL_PASSWORD, and EMAIL_SERVICE environment variables are set correctly</li>
                <li>Some email providers block automated emails</li>
                <li>Check your spam folder</li>
              </ul>
            </Typography>
            
            <TextField
              label="Test Email Address"
              type="email"
              fullWidth
              value={testEmailAddress}
              onChange={handleTestEmailChange}
              margin="normal"
              variant="outlined"
              helperText="Enter the email address where you want to receive the test email"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTestEmailDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleTestEmail}
            disabled={!testEmailAddress || testingEmail}
            startIcon={testingEmail ? <CircularProgress size={20} /> : <EmailIcon />}
          >
            Send Test Email
          </Button>
        </DialogActions>
      </Dialog>
      
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

export default QRManagement;
