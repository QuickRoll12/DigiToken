import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Layout components
import Layout from './components/layout/Layout';

// Auth components
import Login from './components/auth/Login';
// import Register from './components/auth/Register'; // Uncomment if registration is needed

// Pages
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import QRGenerator from './pages/QRGenerator';
import QRScanner from './pages/QRScanner';
import QRManagement from './pages/QRManagement';
import UserManagement from './pages/UserManagement';
import StudentManagement from './pages/StudentManagement';
import AdminQRScanner from './pages/AdminQRScanner';
import BouncedEmails from './pages/BouncedEmails';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Context
import { AuthProvider } from './context/AuthContext';

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <AuthProvider>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        {/* <Route path="/register" element={<Register />} /> */}

        {/* Protected Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:id" element={<EventDetails />} />
          <Route path="qr-generator" element={<QRGenerator />} />
          <Route path="qr-scanner" element={<QRScanner />} />
          <Route path="qr-management" element={<QRManagement />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="student-management" element={<StudentManagement />} />
          <Route path="admin-qr-scanner" element={<AdminQRScanner />} />
          <Route path="bounced-emails" element={<BouncedEmails />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Redirect to login for any unmatched routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
