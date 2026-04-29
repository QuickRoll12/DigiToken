import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Event as EventIcon,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import * as api from '../utils/api';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  // useAuth not needed anymore since user is not used
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalQRCodes: 0,
    usedQRCodes: 0,
    unusedQRCodes: 0,
    usagePercentage: 0,
    recentEvents: [],
    recentUsage: [],
    usageByDay: [],
    distributionByCourse: [],
    distributionByYear: []
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      
      try {
        // Fetch dashboard statistics from the API
        const dashboardStats = await api.getOverallStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setAlert({
          open: true,
          message: 'Failed to load dashboard data. Please try again later.',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Prepare chart data
  const usageChartData = {
    labels: ['Used', 'Unused'],
    datasets: [
      {
        data: [stats.usedQRCodes || 0, stats.unusedQRCodes || 0],
        backgroundColor: ['#4caf50', '#ff9800'],
        borderColor: ['#388e3c', '#f57c00'],
        borderWidth: 1,
      },
    ],
  };
  
  const courseChartData = {
    labels: stats.distributionByCourse && Array.isArray(stats.distributionByCourse) ? 
      stats.distributionByCourse.map(item => item.course) : [],
    datasets: [
      {
        label: 'Used',
        data: stats.distributionByCourse && Array.isArray(stats.distributionByCourse) ? 
          stats.distributionByCourse.map(item => item.used) : [],
        backgroundColor: '#5c6bc0',
      },
      {
        label: 'Unused',
        data: stats.distributionByCourse && Array.isArray(stats.distributionByCourse) ? 
          stats.distributionByCourse.map(item => item.unused) : [],
        backgroundColor: '#26a69a',
      },
    ],
  };
  
  const dailyUsageChartData = {
    labels: stats.usageByDay && Array.isArray(stats.usageByDay) ? 
      stats.usageByDay.map(item => {
        const date = new Date(item._id);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }) : [],
    datasets: [
      {
        label: 'QR Codes Used',
        data: stats.usageByDay && Array.isArray(stats.usageByDay) ? 
          stats.usageByDay.map(item => item.count) : [],
        backgroundColor: '#5c6bc0',
      },
    ],
  };
  
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

  const handleCloseAlert = () => {
    setAlert({
      ...alert,
      open: false
    });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Dashboard
      </Typography>
      
      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 150,
              bgcolor: 'primary.light',
              color: 'white',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" component="div" fontWeight="600" noWrap>
                Total Events
              </Typography>
              <EventIcon fontSize="large" sx={{ opacity: 0.8 }} />
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 1.5, fontWeight: 'bold' }}>
              {stats.totalEvents}
            </Typography>
            <Typography variant="body2" sx={{ mt: 'auto', opacity: 0.9 }} noWrap>
              {stats.activeEvents} active events
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 150,
              bgcolor: 'secondary.light',
              color: 'white',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" component="div" fontWeight="600" noWrap>
                Total QR Codes
              </Typography>
              <QrCodeIcon fontSize="large" sx={{ opacity: 0.8 }} />
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 1.5, fontWeight: 'bold' }}>
              {stats.totalQRCodes}
            </Typography>
            <Typography variant="body2" sx={{ mt: 'auto', opacity: 0.9 }} noWrap>
              {stats.usagePercentage}% usage rate
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 150,
              bgcolor: 'success.light',
              color: 'white',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" component="div" fontWeight="600" noWrap>
                Used QR Codes
              </Typography>
              <CheckCircleIcon fontSize="large" sx={{ opacity: 0.8 }} />
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 1.5, fontWeight: 'bold' }}>
              {stats.usedQRCodes}
            </Typography>
            <Typography variant="body2" sx={{ mt: 'auto', opacity: 0.9 }} noWrap>
              {stats.recentUsage?.length || 0} used today
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 150,
              bgcolor: 'warning.light',
              color: 'white',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" component="div" fontWeight="600" noWrap>
                Unused QR Codes
              </Typography>
              <CancelIcon fontSize="large" sx={{ opacity: 0.8 }} />
            </Box>
            <Typography variant="h3" component="div" sx={{ mt: 1.5, fontWeight: 'bold' }}>
              {stats.unusedQRCodes}
            </Typography>
            <Typography variant="body2" sx={{ mt: 'auto', opacity: 0.9 }} noWrap>
              Available for distribution
            </Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts and Lists */}
      <Grid container spacing={3}>
        {/* QR Usage Chart */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                QR Code Usage
              </Typography>
              <Box sx={{ height: 250, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Pie data={usageChartData} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Course Distribution Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Distribution by Course
              </Typography>
              <Box sx={{ height: 250 }}>
                <Bar options={barOptions} data={courseChartData} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Daily Usage Chart */}
        <Grid item xs={12}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Daily QR Code Usage (Last 7 Days)
              </Typography>
              <Box sx={{ height: 300 }}>
                <Bar options={barOptions} data={dailyUsageChartData} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Events */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Recent Events
              </Typography>
              <List>
                {stats.recentEvents.map((event) => (
                  <React.Fragment key={event._id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: event.isActive ? 'primary.main' : 'text.disabled' }}>
                          <EventIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'medium' }}>
                              {event.name}
                            </Typography>
                            <Chip
                              size="small"
                              label={event.isActive ? 'Active' : 'Inactive'}
                              color={event.isActive ? 'success' : 'default'}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {new Date(event.date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                            <Typography component="span" variant="body2" display="block">
                              {event.venue}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent QR Usage */}
        <Grid item xs={12} md={6}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Recent QR Code Usage
              </Typography>
              <List>
                {stats.recentUsage.map((usage) => (
                  <React.Fragment key={usage._id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                          <SchoolIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'medium' }}>
                              {usage.course} - {usage.year}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                            {usage.event?.name || 'Unknown Event'}
                            </Typography>
                            <Typography component="span" variant="body2" display="block">
                              Used at: {new Date(usage.usedAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
