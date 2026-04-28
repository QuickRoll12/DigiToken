import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Grid, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import * as api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StudentManagement = () => {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    course: '',
    year: '',
    rollNumber: '',
    department: ''
  });
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    search: ''
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Fetch students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);
  
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getAllStudents(filters);
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setAlert({
        open: true,
        message: `Failed to fetch students: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Apply filters when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [filters]);
  
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      course: '',
      year: '',
      search: ''
    });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddStudent = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      email: '',
      course: '',
      year: '',
      rollNumber: '',
      department: ''
    });
    setOpenDialog(true);
  };
  
  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      course: student.course,
      year: student.year,
      rollNumber: student.rollNumber || '',
      department: student.department || ''
    });
    setOpenDialog(true);
  };
  
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) {
      return;
    }
    
    try {
      setLoading(true);
      await api.deleteStudent(id);
      
      setStudents(students.filter(student => student._id !== id));
      
      setAlert({
        open: true,
        message: 'Student deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error deleting student:', error);
      setAlert({
        open: true,
        message: `Failed to delete student: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    // Validate form data
    if (!formData.name || !formData.email || !formData.course || !formData.year) {
      setAlert({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      if (editingStudent) {
        // Update existing student
        const updatedStudent = await api.updateStudent(editingStudent._id, formData);
        
        setStudents(students.map(student => 
          student._id === editingStudent._id ? updatedStudent : student
        ));
        
        setAlert({
          open: true,
          message: 'Student updated successfully',
          severity: 'success'
        });
      } else {
        // Create new student
        const newStudent = await api.createStudent(formData);
        
        setStudents([...students, newStudent]);
        
        setAlert({
          open: true,
          message: 'Student added successfully',
          severity: 'success'
        });
      }
      
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving student:', error);
      setAlert({
        open: true,
        message: `Failed to save student: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };
  
  const handleCloseAlert = () => {
    setAlert({
      ...alert,
      open: false
    });
  };
  
  // File upload handling
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Check if it's a CSV file
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setAlert({
        open: true,
        message: 'Please upload a CSV file',
        severity: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      setUploadProgress(0);
      
      // Upload the file
      const result = await api.uploadStudentCSV(file);
      
      setUploadStats({
        total: result.total,
        added: result.added,
        updated: result.updated,
        errors: result.errors
      });
      
      setUploadProgress(100);
      
      // Refresh the student list
      fetchStudents();
      
      setAlert({
        open: true,
        message: `Successfully processed ${result.total} students (${result.added} added, ${result.updated} updated)`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setAlert({
        open: true,
        message: `Failed to upload CSV: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });
  
  // DataGrid columns
  const columns = [
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'course', headerName: 'Course', flex: 0.7, minWidth: 120 },
    { field: 'year', headerName: 'Year', flex: 0.5, minWidth: 80 },
    { field: 'rollNumber', headerName: 'Roll Number', flex: 0.7, minWidth: 120 },
    { field: 'department', headerName: 'Department', flex: 0.7, minWidth: 120 },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.5,
      minWidth: 120,
      renderCell: (params) => (
        <Box>
          <IconButton 
            color="primary" 
            onClick={() => handleEditStudent(params.row)}
            size="small"
          >
            <EditIcon />
          </IconButton>
          <IconButton 
            color="error" 
            onClick={() => handleDeleteStudent(params.row._id)}
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )
    }
  ];
  
  // Download CSV template
  const downloadTemplate = () => {
    const csvContent = "name,email,course,year,rollNumber,department\nJohn Doe,john@example.com,BTech,1,12345,CSE\nJane Smith,jane@example.com,MTech,2,67890,ECE";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Student Management</Typography>
          <Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={handleAddStudent}
              sx={{ mr: 1 }}
            >
              Add Student
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<CloudUploadIcon />} 
              onClick={() => setShowUploadDialog(true)}
            >
              Upload CSV
            </Button>
          </Box>
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <TextField
              label="Course"
              name="course"
              value={filters.course}
              onChange={handleFilterChange}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Year"
              name="year"
              value={filters.year}
              onChange={handleFilterChange}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              fullWidth
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <IconButton 
                    size="small" 
                    onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                    sx={{ visibility: filters.search ? 'visible' : 'hidden' }}
                  >
                    <ClearIcon />
                  </IconButton>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button 
              variant="outlined" 
              onClick={clearFilters}
              fullWidth
              startIcon={<ClearIcon />}
            >
              Clear
            </Button>
          </Grid>
        </Grid>
        
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={students}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            checkboxSelection
            disableSelectionOnClick
            loading={loading}
            getRowId={(row) => row._id}
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none'
              }
            }}
          />
        </Box>
      </Paper>
      
      {/* Add/Edit Student Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStudent ? 'Edit Student' : 'Add New Student'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Email *"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Course *"
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Year *"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Roll Number"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* CSV Upload Dialog */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Student Data</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Upload a CSV file containing student information. The CSV should have the following columns:
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>Required: </Typography>
            <Chip label="name" size="small" sx={{ mr: 0.5 }} />
            <Chip label="email" size="small" sx={{ mr: 0.5 }} />
            <Chip label="course" size="small" sx={{ mr: 0.5 }} />
            <Chip label="year" size="small" sx={{ mr: 0.5 }} />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>Optional: </Typography>
            <Chip label="rollNumber" size="small" sx={{ mr: 0.5 }} />
            <Chip label="department" size="small" sx={{ mr: 0.5 }} />
          </Box>
          
          <Button 
            variant="outlined" 
            startIcon={<DownloadIcon />} 
            onClick={downloadTemplate}
            sx={{ mb: 3 }}
          >
            Download Template
          </Button>
          
          <Box 
            {...getRootProps()} 
            sx={{ 
              border: '2px dashed #ccc', 
              borderRadius: 2, 
              p: 3, 
              textAlign: 'center',
              backgroundColor: isDragActive ? '#f0f8ff' : 'transparent',
              cursor: 'pointer'
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the CSV file here' : 'Drag & drop a CSV file here, or click to select'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Only CSV files are accepted
            </Typography>
          </Box>
          
          {uploadProgress > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Upload progress: {uploadProgress}%
              </Typography>
              <Box sx={{ width: '100%', bgcolor: '#eee', borderRadius: 1, mt: 1 }}>
                <Box 
                  sx={{ 
                    width: `${uploadProgress}%`, 
                    bgcolor: 'primary.main', 
                    height: 10, 
                    borderRadius: 1,
                    transition: 'width 0.3s ease-in-out'
                  }} 
                />
              </Box>
            </Box>
          )}
          
          {uploadStats && (
            <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Upload Results</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="body2">Total processed:</Typography>
                  <Typography variant="h6">{uploadStats.total}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2">Added:</Typography>
                  <Typography variant="h6" color="success.main">{uploadStats.added}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2">Updated:</Typography>
                  <Typography variant="h6" color="primary.main">{uploadStats.updated}</Typography>
                </Grid>
              </Grid>
              
              {uploadStats.errors && uploadStats.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="error" gutterBottom>
                    Errors ({uploadStats.errors.length}):
                  </Typography>
                  <Box sx={{ maxHeight: 100, overflowY: 'auto', bgcolor: '#fff', p: 1, borderRadius: 1 }}>
                    {uploadStats.errors.map((error, index) => (
                      <Typography key={index} variant="caption" display="block" color="error">
                        {error.email ? `${error.email}: ` : ''}{error.error || error.message}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentManagement;