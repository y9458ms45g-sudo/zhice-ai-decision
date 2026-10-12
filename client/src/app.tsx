import React, { useEffect } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import KnowledgePage from './pages/KnowledgePage/KnowledgePage';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import LoginPage from './pages/LoginPage/LoginPage';
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
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<KnowledgePage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
    </QueryClientProvider>
  );
};

export default RoutesComponent;
