import React, { useState, useEffect } from 'react';
import * as api from '../utils/api';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  Snackbar,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  VpnKey as VpnKeyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AdminPanelSettings as AdminIcon,
  EventNote as EventNoteIcon,
  QrCode as QrCodeIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleToggleEditing = () => {
    if (editing) {
      // Reset form data if canceling edit
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setEditing(!editing);
  };

  const handleToggleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.email) {
      setAlert({
        open: true,
        message: 'Name and email are required',
        severity: 'error'
      });
      return;
    }
    
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setAlert({
        open: true,
        message: 'Passwords do not match',
        severity: 'error'
      });
      return;
    }
    
    try {
      // Prepare update data
      const updateData = {
        name: formData.name,
        email: formData.email
      };
      
      // Add password data if changing password
      if (formData.newPassword && formData.currentPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }
      
      // Call API to update profile
      await api.updateProfile(updateData);
      
      // Update user context
      updateUser({
        ...user,
        name: formData.name,
        email: formData.email
      });
      
      setAlert({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
      
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setAlert({
        open: true,
        message: `Failed to update profile: ${error.message || 'Unknown error'}`,
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

  const [recentActivity, setRecentActivity] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [userStats, setUserStats] = useState({
    eventsCount: 0,
    qrCodesCount: 0,
    usedQRCodesCount: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      setLoadingActivity(true);
      try {
        // Fetch recent user activity from the API
        const activityData = await api.getUserActivity();
        setRecentActivity(activityData);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        // Set empty array if there's an error
        setRecentActivity([]);
      } finally {
        setLoadingActivity(false);
      }
    };

    const fetchUserStats = async () => {
      setLoadingStats(true);
      try {
        // Fetch user statistics from the API
        const statsData = await api.getUserStats();
        setUserStats(statsData);
      } catch (error) {
        console.error('Error fetching user statistics:', error);
        // Keep default values if there's an error
      } finally {
        setLoadingStats(false);
      }
    };

    fetchRecentActivity();
    fetchUserStats();
  }, []);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Profile
      </Typography>
      
      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Profile Information
              </Typography>
              
              <Button
                variant={editing ? 'outlined' : 'contained'}
                color={editing ? 'error' : 'primary'}
                startIcon={editing ? null : <EditIcon />}
                onClick={handleToggleEditing}
              >
                {editing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
            
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!editing}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!editing}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                
                {editing && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Change Password (Optional)
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Current Password"
                        name="currentPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <VpnKeyIcon />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={handleToggleShowPassword}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="New Password"
                        name="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <VpnKeyIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Confirm New Password"
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <VpnKeyIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  </>
                )}
                
                {editing && (
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      sx={{ mt: 2 }}
                    >
                      Save Changes
                    </Button>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Paper>
        </Grid>
        
        {/* User Info Card */}
        <Grid item xs={12} md={4}>
          <Card sx={{ boxShadow: 'none', border: '1px solid #e0e0e0', height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'primary.main',
                  fontSize: '2.5rem',
                  mb: 2
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Avatar>
              
              <Typography variant="h5" gutterBottom>
                {user?.name}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: user?.role === 'admin' ? 'primary.light' : 'secondary.light',
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 1,
                mt: 1
              }}>
                <AdminIcon fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  {user?.role === 'admin' ? 'Administrator' : 'Staff'}
                </Typography>
              </Box>
              
              <Divider sx={{ width: '100%', my: 3 }} />
              
              <Box sx={{ width: '100%' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Account Statistics
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                      {loadingStats ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <Typography variant="h4" color="primary.main">
                          {userStats.eventsCount}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Events Created
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                      {loadingStats ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <Typography variant="h4" color="secondary.main">
                          {userStats.qrCodesCount}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        QR Codes Generated
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Paper sx={{ p: 2, textAlign: 'center', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                      {loadingStats ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                          <CircularProgress size={24} />
                        </Box>
                      ) : (
                        <Typography variant="h4" color="success.main">
                          {userStats.usedQRCodesCount}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        QR Codes Used
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, boxShadow: 'none', border: '1px solid #e0e0e0' }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            <List>
              {recentActivity.map((activity) => (
                <ListItem key={activity.id} divider>
                  <ListItemIcon>
                    {activity.type === 'event' ? (
                      <EventNoteIcon color="primary" />
                    ) : activity.type === 'qr' ? (
                      <QrCodeIcon color="secondary" />
                    ) : (
                      <HistoryIcon />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.description}
                    secondary={new Date(activity.timestamp).toLocaleString()}
                  />
                </ListItem>
              ))}
            </List>
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

export default Profile;
