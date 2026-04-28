import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  IconButton, 
  Divider, 
  Avatar, 
  Menu, 
  MenuItem, 
  useMediaQuery, 
  useTheme 
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Event as EventIcon,
  QrCode as QrCodeIcon,
  QrCodeScanner as QrCodeScannerIcon,
  List as ListIcon,
  Person as PersonIcon,
  Menu as MenuIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  AdminPanelSettings as AdminIcon,
  ErrorOutline as ErrorOutlineIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';

// Drawer width
const drawerWidth = 240;

const Layout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
    handleProfileMenuClose();
  };
  
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };
  
  // Navigation items
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Events', icon: <EventIcon />, path: '/events' },
    { text: 'QR Generator', icon: <QrCodeIcon />, path: '/qr-generator' },
    { text: 'QR Scanner', icon: <QrCodeScannerIcon />, path: '/qr-scanner' },
    { text: 'QR Management', icon: <ListIcon />, path: '/qr-management' },
  ];
  
  // Admin-only items
  const adminItems = [
    { text: 'User Management', icon: <PersonIcon />, path: '/user-management' },
    { text: 'Student Management', icon: <PersonIcon />, path: '/student-management' },
    { text: 'Admin QR Scanner', icon: <AdminIcon />, path: '/admin-qr-scanner' },
    { text: 'Bounced Emails', icon: <ErrorOutlineIcon />, path: '/bounced-emails' },
  ];
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          width: { sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { sm: drawerOpen ? `${drawerWidth}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            DigiToken
          </Typography>
          
          {user && (
            <>
              <IconButton
                size="large"
                edge="end"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </Avatar>
              </IconButton>
              
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
              >
                <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={drawerOpen}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {navItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  selected={location.pathname === item.path}
                  onClick={() => handleNavigation(item.path)}
                >
                  <ListItemIcon sx={{ 
                    color: location.pathname === item.path ? 'primary.main' : 'text.secondary' 
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ 
                      fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                      color: location.pathname === item.path ? 'primary.main' : 'text.primary'
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {user && user.role === 'admin' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>
                Admin
              </Typography>
              <List>
                {adminItems.map((item) => (
                  <ListItem key={item.text} disablePadding>
                    <ListItemButton 
                      selected={location.pathname === item.path}
                      onClick={() => handleNavigation(item.path)}
                    >
                      <ListItemIcon sx={{ 
                        color: location.pathname === item.path ? 'primary.main' : 'text.secondary' 
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={item.text} 
                        primaryTypographyProps={{ 
                          fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                          color: location.pathname === item.path ? 'primary.main' : 'text.primary'
                        }} 
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: 3,
        width: { sm: `calc(100% - ${drawerOpen ? drawerWidth : 0}px)` },
        ml: { sm: drawerOpen ? `${drawerWidth}px` : 0 },
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
