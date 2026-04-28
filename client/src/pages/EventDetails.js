import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Chip,
  Stack,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as AccessTimeIcon,
  QrCode as QrCodeIcon,
  Person as PersonIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// TabPanel component for tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchEventDetails = async () => {
      setLoading(true);
      
      try {
        // Fetch event details from the API
        const eventData = await api.getEventById(id);
        setEvent(eventData);
        
        try {
          // Fetch event statistics from the API
          const statsData = await api.getEventStats(id);
          // Ensure stats data has all required properties
          setStats(statsData || {
            totalQRCodes: 0,
            usedQRCodes: 0,
            unusedQRCodes: 0,
            usagePercentage: 0,
            courseDistribution: [],
            yearDistribution: [],
            mealTypeDistribution: [],
            usageTimeline: []
          });
        } catch (statsError) {
          console.error('Error fetching event stats:', statsError);
          // Set default empty stats object if stats fetch fails
          setStats({
            totalQRCodes: 0,
            usedQRCodes: 0,
            unusedQRCodes: 0,
            usagePercentage: 0,
            courseDistribution: [],
            yearDistribution: [],
            mealTypeDistribution: [],
            usageTimeline: []
          });
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        // If the event is not found, we'll handle it in the UI
        if (error.message === 'Event not found') {
          setEvent(null);
        }
        // Set default empty stats object
        setStats({
          totalQRCodes: 0,
          usedQRCodes: 0,
          unusedQRCodes: 0,
          usagePercentage: 0,
          courseDistribution: [],
          yearDistribution: [],
          mealTypeDistribution: [],
          usageTimeline: []
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBackClick = () => {
    navigate('/events');
  };

  const handleEditEvent = () => {
    // In a real app, this would navigate to an edit form or open a modal
    // For now, we'll just navigate back to the events page
    navigate('/events');
  };

  const handleGenerateQR = () => {
    // Navigate to QR generator with pre-selected event
    navigate('/qr-generator');
  };

  // Prepare chart data
  const usageChartData = stats ? {
    labels: ['Used', 'Unused'],
    datasets: [
      {
        data: stats.usedQRCodes !== null && stats.usedQRCodes !== undefined ? [stats.usedQRCodes, stats.unusedQRCodes] : [0, 0],
        backgroundColor: ['#4caf50', '#ff9800'],
        borderColor: ['#388e3c', '#f57c00'],
        borderWidth: 1,
      },
    ],
  } : null;
  
  const courseChartData = stats && stats.courseDistribution && Array.isArray(stats.courseDistribution) ? {
    labels: stats.courseDistribution.map(item => item.course || 'Unknown'),
    datasets: [
      {
        label: 'Used',
        data: stats.courseDistribution.map(item => item.used || 0),
        backgroundColor: '#5c6bc0',
      },
      {
        label: 'Unused',
        data: stats.courseDistribution.map(item => item.unused || 0),
        backgroundColor: '#26a69a',
      },
    ],
  } : null;
  
  const mealTypeChartData = stats && stats.mealTypeDistribution && Array.isArray(stats.mealTypeDistribution) ? {
    labels: stats.mealTypeDistribution.map(item => item.mealType || 'Unknown'),
    datasets: [
      {
        data: stats.mealTypeDistribution.map(item => item.count || 0),
        backgroundColor: ['#66bb6a', '#ef5350', '#42a5f5'],
        borderColor: ['#43a047', '#d32f2f', '#1e88e5'],
        borderWidth: 1,
      },
    ],
  } : null;
  
  const timelineChartData = stats && stats.usageTimeline && Array.isArray(stats.usageTimeline) ? {
    labels: stats.usageTimeline.map(item => {
      if (!item || !item._id) return 'Unknown';
      const time = item._id.split(' ')[1] || '00';
      return `${time}:00`;
    }),
    datasets: [
      {
        label: 'QR Codes Used',
        data: stats.usageTimeline.map(item => item.count || 0),
        backgroundColor: '#5c6bc0',
      },
    ],
  } : null;
  
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
      },
    },
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!event) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Event not found
        </Typography>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mt: 2 }}
        >
          Back to Events
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleBackClick} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
          Event Details
        </Typography>
      </Box>
      
      {/* Event Info Card */}
      <Paper sx={{ p: 3, mb: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h5" gutterBottom>
              {event.name}
            </Typography>
            <Chip 
              label={event.isActive ? 'Active' : 'Inactive'} 
              color={event.isActive ? 'success' : 'default'} 
              size="small" 
              sx={{ mb: 2 }}
            />
          </Box>
          
          {isAdmin() && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditEvent}
            >
              Edit Event
            </Button>
          )}
        </Box>
        
        <Typography variant="body1" paragraph>
          {event.description}
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body1">
                <strong>Date:</strong> {new Date(event.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AccessTimeIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body1">
                <strong>Time:</strong> {new Date(event.date).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body1">
                <strong>Venue:</strong> {event.venue}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Eligible Courses:</strong>
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {event.eligibleCourses.length > 0 ? (
                  event.eligibleCourses.map((course) => (
                    <Chip 
                      key={course} 
                      label={course} 
                      size="small" 
                      color="primary" 
                      variant="outlined" 
                      sx={{ mb: 1 }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    All courses
                  </Typography>
                )}
              </Stack>
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Eligible Years:</strong>
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {event.eligibleYears.length > 0 ? (
                  event.eligibleYears.map((year) => (
                    <Chip 
                      key={year} 
                      label={year} 
                      size="small" 
                      color="secondary" 
                      variant="outlined" 
                      sx={{ mb: 1 }}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    All years
                  </Typography>
                )}
              </Stack>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
              <Typography variant="body1">
                <strong>Created By:</strong> {event.createdBy.name}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              QR Code Statistics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats && stats.totalQRCodes ? `${stats.totalQRCodes} total QR codes | ${stats.usedQRCodes || 0} used | ${stats.unusedQRCodes || 0} unused` : 'No QR code data available'}
            </Typography>
          </Box>
          
          {isAdmin() && (
            <Button
              variant="contained"
              startIcon={<QrCodeIcon />}
              onClick={handleGenerateQR}
            >
              Generate QR Codes
            </Button>
          )}
        </Box>
      </Paper>
      
      {/* Tabs for Statistics */}
      <Paper sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="event statistics tabs">
            <Tab label="Overview" id="event-tab-0" aria-controls="event-tabpanel-0" />
            <Tab label="Course Distribution" id="event-tab-1" aria-controls="event-tabpanel-1" />
            <Tab label="Meal Types" id="event-tab-2" aria-controls="event-tabpanel-2" />
            <Tab label="Usage Timeline" id="event-tab-3" aria-controls="event-tabpanel-3" />
          </Tabs>
        </Box>
        
        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QR Code Usage
                  </Typography>
                  <Box sx={{ height: 250, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Pie data={usageChartData} />
                  </Box>
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="body1" color="text.secondary">
                      {stats && stats.usagePercentage !== undefined ? `${stats.usagePercentage}% of QR codes have been used` : 'No usage data available'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={8}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QR Code Distribution by Course
                  </Typography>
                  <Box sx={{ height: 250 }}>
                    <Bar options={barOptions} data={courseChartData} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QR Code Distribution by Meal Type
                  </Typography>
                  <Box sx={{ height: 250, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Doughnut data={mealTypeChartData} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Usage Timeline
                  </Typography>
                  <Box sx={{ height: 250 }}>
                    <Bar options={barOptions} data={timelineChartData} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Course Distribution Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QR Code Distribution by Course
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <Bar options={barOptions} data={courseChartData} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Course Distribution Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    {stats.courseDistribution.map((item) => (
                      <Grid item xs={12} sm={6} md={4} key={item.course}>
                        <Paper sx={{ p: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {item.course}
                          </Typography>
                          <Typography variant="h4" color="primary" gutterBottom>
                            {item.count}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="success.main">
                              Used: {item.used}
                            </Typography>
                            <Typography variant="body2" color="warning.main">
                              Unused: {item.unused}
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 1, height: 5, bgcolor: '#f0f0f0', borderRadius: 5 }}>
                            <Box 
                              sx={{ 
                                height: '100%', 
                                width: `${(item.used / item.count) * 100}%`, 
                                bgcolor: 'success.main',
                                borderRadius: 5
                              }} 
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {Math.round((item.used / item.count) * 100)}% usage rate
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Meal Types Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QR Code Distribution by Meal Type
                  </Typography>
                  <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Doughnut data={mealTypeChartData} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Meal Type Distribution Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    {stats.mealTypeDistribution.map((item) => (
                      <Grid item xs={12} key={item.mealType}>
                        <Paper sx={{ p: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
                          </Typography>
                          <Typography variant="h4" color="primary" gutterBottom>
                            {item.count}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="success.main">
                              Used: {item.used}
                            </Typography>
                            <Typography variant="body2" color="warning.main">
                              Unused: {item.unused}
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 1, height: 5, bgcolor: '#f0f0f0', borderRadius: 5 }}>
                            <Box 
                              sx={{ 
                                height: '100%', 
                                width: `${(item.used / item.count) * 100}%`, 
                                bgcolor: 'success.main',
                                borderRadius: 5
                              }} 
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {Math.round((item.used / item.count) * 100)}% usage rate
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Usage Timeline Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    QR Code Usage Timeline
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <Bar options={barOptions} data={timelineChartData} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Usage Timeline Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    {stats.usageTimeline.map((item, index) => (
                      <Grid item xs={12} sm={6} md={3} key={index}>
                        <Paper sx={{ p: 2, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {item._id.split(' ')[1]}:00
                          </Typography>
                          <Typography variant="h4" color="primary">
                            {item.count}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            QR codes scanned during this hour
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default EventDetails;
