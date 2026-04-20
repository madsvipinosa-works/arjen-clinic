'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext();

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing admin session on mount
    const session = localStorage.getItem('adminSession');
    if (session) {
      try {
        const parsedSession = JSON.parse(session);
        // Check if session is still valid (24 hours)
        if (Date.now() - parsedSession.loginTime < 24 * 60 * 60 * 1000) {
          setAdmin(parsedSession);
        } else {
          localStorage.removeItem('adminSession');
        }
      } catch (error) {
        localStorage.removeItem('adminSession');
      }
    }
    setLoading(false);
  }, []);

  const login = (adminData) => {
    setAdmin(adminData);
    localStorage.setItem('adminSession', JSON.stringify({
      ...adminData,
      loginTime: Date.now()
    }));
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    setAdmin(null);
    localStorage.removeItem('adminSession');
  };

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}
