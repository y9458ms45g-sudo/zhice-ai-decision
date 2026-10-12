import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '@client/src/api/auth';
import { isGuestMode } from '@client/src/api/guest-mode';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = getToken();

  if (!token && !isGuestMode()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
