import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/Toast';
import Sidebar from './components/Layout/Sidebar';
import AuthPage from './components/Auth/AuthPage';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Trends from './pages/Trends';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import './styles/globals.css';

function AppLayout() {
  const { toasts, success, error, info } = useToast();
  const toast = { success, error, info };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History toast={toast} />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/settings" element={<Settings toast={toast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer toasts={toasts} />
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: 'rgba(0,212,170,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <path d="M8 14h12M14 8v12M8 10l6-2 6 2M8 18l6 2 6-2" stroke="#00d4aa" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{
        width: 24, height: 24, border: '2px solid rgba(0,212,170,0.2)',
        borderTop: '2px solid var(--accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute />} />
          <Route path="/*" element={<ProtectedRoute />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}
