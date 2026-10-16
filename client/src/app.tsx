import React, { useEffect } from 'react';
import { Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage/HomePage';
import KnowledgePage from './pages/KnowledgePage/KnowledgePage';
import ActionPage from './pages/ActionPage/ActionPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import ProfileGraphPage from './pages/ProfileGraphPage/ProfileGraphPage';
import LoginPage from './pages/LoginPage/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage';
import NotFound from './pages/NotFound/NotFound';
import { setupAuthInterceptor } from './api/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

const RoutesComponent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setupAuthInterceptor(() => {
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  return (
    <QueryClientProvider client={queryClient}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="action" element={<ActionPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="profile-graph" element={<Navigate to="/knowledge#profile" replace />} />
        <Route path="strategy" element={<Navigate to="/action" replace />} />
        <Route path="monetize" element={<Navigate to="/action" replace />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </QueryClientProvider>
  );
};

export default RoutesComponent;
