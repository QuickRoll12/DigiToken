import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, IconButton, Chip, TextField, Select,
  MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Snackbar, Checkbox, Tooltip, CircularProgress,
  Card, CardContent, Grid, TablePagination, InputAdornment, Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CheckCircle as ResolveIcon,
  Replay as RetryIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  ErrorOutline as ErrorIcon,
  CheckCircleOutline as SuccessIcon,
  HourglassEmpty as PendingIcon,
  Cancel as FailedIcon
} from '@mui/icons-material';
import * as api from '../utils/api';

const BouncedEmails = () => {
  const [bouncedEmails, setBouncedEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selected, setSelected] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    event: ''
  });

  // Dialogs
  const [detailDialog, setDetailDialog] = useState({ open: false, record: null });
  const [retryDialog, setRetryDialog] = useState({ open: false, record: null, correctedEmail: '' });
  const [resolveDialog, setResolveDialog] = useState({ open: false, notes: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBouncedEmails = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const data = await api.getBouncedEmails(params);
      setBouncedEmails(data.bouncedEmails || []);
      setTotal(data.total || 0);
    } catch (error) {
      showSnackbar(error.message || 'Failed to fetch bounced emails', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getBouncedEmailStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchBouncedEmails();
    fetchStats();
  }, [fetchBouncedEmails, fetchStats]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleResolve = async (id) => {
    try {
      setActionLoading(true);
      await api.resolveBouncedEmail(id, resolveDialog.notes);
      showSnackbar('Record marked as resolved');
      setResolveDialog({ open: false, notes: '' });
      fetchBouncedEmails();
      fetchStats();
    } catch (error) {
      showSnackbar(error.message || 'Failed to resolve', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkResolve = async () => {
    if (selected.length === 0) return;
    try {
      setActionLoading(true);
      await api.bulkResolveBouncedEmails(selected);
      showSnackbar(`${selected.length} records marked as resolved`);
      setSelected([]);
      fetchBouncedEmails();
      fetchStats();
    } catch (error) {
      showSnackbar(error.message || 'Failed to bulk resolve', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      setActionLoading(true);
      await api.deleteBouncedEmail(id);
      showSnackbar('Record deleted');
      fetchBouncedEmails();
      fetchStats();
    } catch (error) {
      showSnackbar(error.message || 'Failed to delete', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!window.confirm(`Delete ${selected.length} selected records?`)) return;
    try {
      setActionLoading(true);
      await api.bulkDeleteBouncedEmails(selected);
      showSnackbar(`${selected.length} records deleted`);
      setSelected([]);
      fetchBouncedEmails();
      fetchStats();
    } catch (error) {
      showSnackbar(error.message || 'Failed to bulk delete', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!retryDialog.record) return;
    try {
      setActionLoading(true);
      await api.retryBouncedEmail(
        retryDialog.record._id,
        retryDialog.correctedEmail || null
      );
      showSnackbar('Email re-sent successfully!');
      setRetryDialog({ open: false, record: null, correctedEmail: '' });
      fetchBouncedEmails();
      fetchStats();
    } catch (error) {
      showSnackbar(error.message || 'Retry failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await api.exportBouncedEmails(filters);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bounced-emails-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSnackbar('CSV exported successfully');
    } catch (error) {
      showSnackbar(error.message || 'Failed to export', 'error');
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelected(bouncedEmails.map(b => b._id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getStatusChip = (status) => {
    const config = {
      pending: { color: 'warning', icon: <PendingIcon fontSize="small" />, label: 'Pending' },
      resolved: { color: 'success', icon: <SuccessIcon fontSize="small" />, label: 'Resolved' },
      retry_success: { color: 'success', icon: <SuccessIcon fontSize="small" />, label: 'Retry OK' },
      retry_failed: { color: 'error', icon: <FailedIcon fontSize="small" />, label: 'Retry Failed' }
    };
    const c = config[status] || config.pending;
    return <Chip size="small" icon={c.icon} label={c.label} color={c.color} variant="outlined" />;
  };

  const getBounceTypeChip = (type) => {
    const colors = {
      invalid_address: 'error',
      mailbox_full: 'warning',
      domain_error: 'error',
      rejected: 'error',
      unknown: 'default'
    };
    return (
      <Chip
        size="small"
        label={type?.replace(/_/g, ' ') || 'unknown'}
        color={colors[type] || 'default'}
        variant="filled"
        sx={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">Bounced Emails</Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage failed email deliveries
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport} size="small">
            Export CSV
          </Button>
          <Button startIcon={<RefreshIcon />} variant="contained" onClick={() => { fetchBouncedEmails(); fetchStats(); }} size="small">
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight="bold" color="warning.dark">{stats.total}</Typography>
                <Typography variant="body2" color="text.secondary">Total Bounced</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#fce4ec' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight="bold" color="error.dark">{stats.pending}</Typography>
                <Typography variant="body2" color="text.secondary">Pending</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight="bold" color="success.dark">{stats.resolved + stats.retrySuccess}</Typography>
                <Typography variant="body2" color="text.secondary">Resolved</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight="bold" color="info.dark">{stats.retryFailed}</Typography>
                <Typography variant="body2" color="text.secondary">Retry Failed</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search name, email, roll number..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filters.status} label="Status" onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="resolved">Resolved</MenuItem>
              <MenuItem value="retry_success">Retry OK</MenuItem>
              <MenuItem value="retry_failed">Retry Failed</MenuItem>
            </Select>
          </FormControl>
          {selected.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="primary">{selected.length} selected</Typography>
              <Button size="small" color="success" variant="outlined" startIcon={<ResolveIcon />} onClick={handleBulkResolve}>
                Resolve Selected
              </Button>
              <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={handleBulkDelete}>
                Delete Selected
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : bouncedEmails.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No bounced emails found</Typography>
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < bouncedEmails.length}
                      checked={bouncedEmails.length > 0 && selected.length === bouncedEmails.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Student</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Course/Year</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Event</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Error</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bouncedEmails.map((record) => (
                  <TableRow key={record._id} hover selected={selected.includes(record._id)}>
                    <TableCell padding="checkbox">
                      <Checkbox checked={selected.includes(record._id)} onChange={() => handleSelectOne(record._id)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{record.studentName}</Typography>
                      {record.studentRollNumber && (
                        <Typography variant="caption" color="text.secondary">{record.studentRollNumber}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {record.studentEmail}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{record.studentCourse} / {record.studentYear}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 120 }}>{record.eventName || '-'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={record.errorMessage}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150, color: 'error.main', fontSize: '0.75rem' }}>
                          {record.errorMessage}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{getBounceTypeChip(record.bounceType)}</TableCell>
                    <TableCell>{getStatusChip(record.status)}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{new Date(record.createdAt).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => setDetailDialog({ open: true, record })}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {record.status === 'pending' && (
                          <>
                            <Tooltip title="Retry with Corrected Email">
                              <IconButton size="small" color="primary" onClick={() => setRetryDialog({ open: true, record, correctedEmail: record.studentEmail })}>
                                <RetryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark Resolved">
                              <IconButton size="small" color="success" onClick={() => { setResolveDialog({ open: true, notes: '', targetId: record._id }); }}>
                                <ResolveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(record._id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div" count={total} page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, record: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Bounced Email Details</DialogTitle>
        <DialogContent dividers>
          {detailDialog.record && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box><Typography variant="caption" color="text.secondary">Student Name</Typography><Typography fontWeight="bold">{detailDialog.record.studentName}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Email</Typography><Typography sx={{ fontFamily: 'monospace' }}>{detailDialog.record.studentEmail}</Typography></Box>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box><Typography variant="caption" color="text.secondary">Course</Typography><Typography>{detailDialog.record.studentCourse}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Year</Typography><Typography>{detailDialog.record.studentYear}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Roll No.</Typography><Typography>{detailDialog.record.studentRollNumber || '-'}</Typography></Box>
              </Box>
              <Divider />
              <Box><Typography variant="caption" color="text.secondary">Event</Typography><Typography>{detailDialog.record.eventName || '-'}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">Bounce Type</Typography>{getBounceTypeChip(detailDialog.record.bounceType)}</Box>
              <Box><Typography variant="caption" color="text.secondary">Error Code</Typography><Typography sx={{ fontFamily: 'monospace' }}>{detailDialog.record.errorCode}</Typography></Box>
              <Box><Typography variant="caption" color="text.secondary">SMTP Code</Typography><Typography sx={{ fontFamily: 'monospace' }}>{detailDialog.record.smtpResponseCode || '-'}</Typography></Box>
              <Alert severity="error" sx={{ mt: 1 }}>{detailDialog.record.errorMessage}</Alert>
              <Divider />
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box><Typography variant="caption" color="text.secondary">Status</Typography>{getStatusChip(detailDialog.record.status)}</Box>
                <Box><Typography variant="caption" color="text.secondary">Retry Count</Typography><Typography>{detailDialog.record.retryCount}</Typography></Box>
              </Box>
              {detailDialog.record.resolutionNotes && (
                <Box><Typography variant="caption" color="text.secondary">Resolution Notes</Typography><Typography variant="body2">{detailDialog.record.resolutionNotes}</Typography></Box>
              )}
              <Box><Typography variant="caption" color="text.secondary">Created At</Typography><Typography variant="body2">{new Date(detailDialog.record.createdAt).toLocaleString()}</Typography></Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, record: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Retry Dialog */}
      <Dialog open={retryDialog.open} onClose={() => setRetryDialog({ open: false, record: null, correctedEmail: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Retry Email Delivery</DialogTitle>
        <DialogContent>
          {retryDialog.record && (
            <Box sx={{ mt: 1 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Retrying for <strong>{retryDialog.record.studentName}</strong>. 
                You can correct the email address below before retrying.
              </Alert>
              <Typography variant="caption" color="text.secondary">Original Email (bounced)</Typography>
              <Typography sx={{ fontFamily: 'monospace', color: 'error.main', mb: 2 }}>{retryDialog.record.studentEmail}</Typography>
              <TextField
                fullWidth label="Corrected Email Address" value={retryDialog.correctedEmail}
                onChange={(e) => setRetryDialog(d => ({ ...d, correctedEmail: e.target.value }))}
                helperText="If the email is corrected, the student's record will also be updated in the database."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRetryDialog({ open: false, record: null, correctedEmail: '' })}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleRetry} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Retry Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog.open} onClose={() => setResolveDialog({ open: false, notes: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Mark as Resolved</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={3} label="Resolution Notes (optional)" sx={{ mt: 1 }}
            value={resolveDialog.notes}
            onChange={(e) => setResolveDialog(d => ({ ...d, notes: e.target.value }))}
            placeholder="e.g., Student contacted via phone, QR sent via WhatsApp"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialog({ open: false, notes: '' })}>Cancel</Button>
          <Button variant="contained" color="success" onClick={() => handleResolve(resolveDialog.targetId)} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Mark Resolved'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BouncedEmails;
