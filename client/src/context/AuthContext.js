import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkLoggedIn = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
          // Optionally verify token validity with the server
          // await api.getUserProfile();
        }
      } catch (error) {
        console.error('Error checking authentication status:', error);
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkLoggedIn();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const userData = await api.login(email, password);
      
      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  // Register function
  const register = async (name, email, password) => {
    try {
      const userData = await api.register(name, email, password);
      
      // Store user in localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: error.message || 'Registration failed' };
    }
  };

  // Update profile function
  const updateProfile = async (userData) => {
    try {
      const updatedUser = await api.updateUserProfile(userData);
      
      // Update stored user data
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const newUserData = { ...storedUser, ...updatedUser };
      
      localStorage.setItem('user', JSON.stringify(newUserData));
      setUser(newUserData);
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, message: error.message || 'Profile update failed' };
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  // Check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const value = {
    user,
    loading,
    login,
    register,
    updateProfile,
    logout,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
