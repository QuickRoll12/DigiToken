import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../utils/api';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Card, 
  CardContent, 
  CardActions, 
  Divider, 
  Alert, 
  Snackbar, 
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Stack
} from '@mui/material';
import {
  Event as EventIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Events = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    eligibleCourses: [],
    eligibleYears: [],
    isActive: true
  });
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const courses = ['B.Tech', 'M.Tech', 'BBA', 'MBA', 'B.Sc', 'M.Sc', 'Ph.D'];
  const years = ['1', '2', '3', '4'];

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      
      try {
        // Fetch events from the API
        const eventsData = await api.getEvents();
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

  const handleOpenDialog = (event = null) => {
    if (event) {
      // Edit mode
      const eventDate = new Date(event.date);
      setEditingEvent(event);
      setFormData({
        name: event.name,
        description: event.description,
        date: eventDate.toISOString().split('T')[0],
        time: eventDate.toTimeString().split(' ')[0].substring(0, 5),
        venue: event.venue,
        eligibleCourses: event.eligibleCourses,
        eligibleYears: event.eligibleYears,
        isActive: event.isActive
      });
    } else {
      // Create mode
      setEditingEvent(null);
      setFormData({
        name: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        eligibleCourses: [],
        eligibleYears: [],
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCheckboxChange = (e, category, item) => {
    const { checked } = e.target;
    
    if (checked) {
      setFormData({
        ...formData,
        [category]: [...formData[category], item]
      });
    } else {
      setFormData({
        ...formData,
        [category]: formData[category].filter(i => i !== item)
      });
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.name || !formData.date || !formData.time || !formData.venue) {
      setAlert({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    // Combine date and time
    const dateTime = new Date(`${formData.date}T${formData.time}`);
    
    // Prepare event data for API
    const eventData = {
      name: formData.name,
      description: formData.description,
      date: dateTime.toISOString(),
      venue: formData.venue,
      eligibleCourses: formData.eligibleCourses,
      eligibleYears: formData.eligibleYears,
      isActive: formData.isActive
    };
    
    try {
      if (editingEvent) {
        // Update existing event via API
        await api.updateEvent(editingEvent._id, eventData);
        
        // Update local state
        const updatedEvents = events.map(event => {
          if (event._id === editingEvent._id) {
            return {
              ...event,
              ...eventData
            };
          }
          return event;
        });
        
        setEvents(updatedEvents);
        setAlert({
          open: true,
          message: 'Event updated successfully',
          severity: 'success'
        });
      } else {
        // Create new event via API
        const newEvent = await api.createEvent(eventData);
        
        // Update local state
        setEvents([newEvent, ...events]);
        setAlert({
          open: true,
          message: 'Event created successfully',
          severity: 'success'
        });
      }
      
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving event:', error);
      setAlert({
        open: true,
        message: `Failed to ${editingEvent ? 'update' : 'create'} event: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      // Delete event via API
      await api.deleteEvent(eventId);
      
      // Update local state
      setEvents(events.filter(event => event._id !== eventId));
      
      setAlert({
        open: true,
        message: 'Event deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      setAlert({
        open: true,
        message: `Failed to delete event: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  const handleToggleEventStatus = async (eventId) => {
    try {
      // Find the event to toggle
      const eventToUpdate = events.find(event => event._id === eventId);
      if (!eventToUpdate) return;
      
      // Prepare update data
      const updateData = {
        isActive: !eventToUpdate.isActive
      };
      
      // Update event via API
      await api.updateEvent(eventId, updateData);
      
      // Update local state
      const updatedEvents = events.map(event => {
        if (event._id === eventId) {
          return {
            ...event,
            isActive: !event.isActive
          };
        }
        return event;
      });
      
      setEvents(updatedEvents);
      
      setAlert({
        open: true,
        message: 'Event status updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating event status:', error);
      setAlert({
        open: true,
        message: `Failed to update event status: ${error.message || 'Unknown error'}`,
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

  const handleViewEventDetails = (eventId) => {
    navigate(`/events/${eventId}`);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Events
        </Typography>
        
        {isAdmin() && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Create Event
          </Button>
        )}
      </Box>
      
      {events.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
          <EventIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No Events Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            Create your first event to get started
          </Typography>
          
          {isAdmin() && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
            >
              Create Event
            </Button>
          )}
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {events.map((event) => (
            <Grid item xs={12} md={6} key={event._id}>
              <Card sx={{ height: '100%', boxShadow: 'none', border: '1px solid #e0e0e0' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" component="div" gutterBottom>
                      {event.name}
                    </Typography>
                    <Chip 
                      label={event.isActive ? 'Active' : 'Inactive'} 
                      color={event.isActive ? 'success' : 'default'} 
                      size="small" 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {event.description}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2">
                      {new Date(event.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <AccessTimeIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2">
                      {new Date(event.date).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2">
                      {event.venue}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Eligible Courses:
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
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Eligible Years:
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
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button 
                    size="small" 
                    onClick={() => handleViewEventDetails(event._id)}
                  >
                    View Details
                  </Button>
                  
                  {isAdmin() && (
                    <>
                      <Button 
                        size="small" 
                        startIcon={<EditIcon />}
                        onClick={() => handleOpenDialog(event)}
                      >
                        Edit
                      </Button>
                      
                      <Button 
                        size="small" 
                        color={event.isActive ? 'warning' : 'success'}
                        onClick={() => handleToggleEventStatus(event._id)}
                      >
                        {event.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      
                      <Button 
                        size="small" 
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteEvent(event._id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* Create/Edit Event Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {editingEvent ? 'Edit Event' : 'Create New Event'}
          <IconButton
            aria-label="close"
            onClick={handleCloseDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 0 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="name"
                label="Event Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                margin="normal"
                fullWidth
                id="description"
                label="Description"
                name="description"
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="date"
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="time"
                label="Time"
                name="time"
                type="time"
                value={formData.time}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="venue"
                label="Venue"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" gutterBottom>
                Eligible Courses
              </Typography>
              <FormGroup>
                {courses.map((course) => (
                  <FormControlLabel
                    key={course}
                    control={
                      <Checkbox
                        checked={formData.eligibleCourses.includes(course)}
                        onChange={(e) => handleCheckboxChange(e, 'eligibleCourses', course)}
                      />
                    }
                    label={course}
                  />
                ))}
              </FormGroup>
              <Typography variant="caption" color="text.secondary">
                Leave all unchecked to include all courses
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" gutterBottom>
                Eligible Years
              </Typography>
              <FormGroup>
                {years.map((year) => (
                  <FormControlLabel
                    key={year}
                    control={
                      <Checkbox
                        checked={formData.eligibleYears.includes(year)}
                        onChange={(e) => handleCheckboxChange(e, 'eligibleYears', year)}
                      />
                    }
                    label={year}
                  />
                ))}
              </FormGroup>
              <Typography variant="caption" color="text.secondary">
                Leave all unchecked to include all years
              </Typography>
            </Grid>
            
            {editingEvent && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                  }
                  label="Active Event"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 3 }}>
          <Button onClick={handleCloseDialog} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" startIcon={editingEvent ? <EditIcon /> : <AddIcon />}>
            {editingEvent ? 'Update Event' : 'Create Event'}
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

export default Events;
