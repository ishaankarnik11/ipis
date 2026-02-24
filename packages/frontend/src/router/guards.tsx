import { Navigate, Outlet } from 'react-router';
import { Spin } from 'antd';
import type { UserRole } from '@ipis/shared';
import { useAuth, getRoleLandingPage } from '../hooks/useAuth';

export function AuthGuard() {
  const { user, isLoading, isAuthenticated, mustChangePassword } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

export function ChangePasswordGuard() {
  const { user, isLoading, isAuthenticated, mustChangePassword } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!mustChangePassword) {
    return <Navigate to={getRoleLandingPage(user.role)} replace />;
  }

  return <Outlet />;
}

export function LoginGuard() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleLandingPage(user.role)} replace />;
  }

  return <Outlet />;
}

interface RoleGuardProps {
  allowedRoles: UserRole[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to={user ? getRoleLandingPage(user.role) : '/login'} replace />;
  }

  return <Outlet />;
}
