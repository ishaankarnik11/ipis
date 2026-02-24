import { createBrowserRouter, Navigate } from 'react-router';
import { Typography } from 'antd';
import type { UserRole } from '@ipis/shared';
import { AuthGuard, LoginGuard, RoleGuard, ChangePasswordGuard } from './guards';
import AppLayout from '../layouts/AppLayout';
import Login from '../pages/auth/Login';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import ChangePassword from '../pages/auth/ChangePassword';
import UserManagement from '../pages/admin/UserManagement';
import SystemConfig from '../pages/admin/SystemConfig';
import AuditLog from '../pages/admin/AuditLog';
import { useAuth, getRoleLandingPage } from '../hooks/useAuth';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <Typography.Title level={3}>{title}</Typography.Title>
      <Typography.Text type="secondary">This page will be implemented in a future story.</Typography.Text>
    </div>
  );
}

function RootRedirect() {
  const { user } = useAuth();
  const target = user ? getRoleLandingPage(user.role as UserRole) : '/login';
  return <Navigate to={target} replace />;
}

export const router = createBrowserRouter([
  // Public routes (login guard redirects authenticated users away)
  {
    element: <LoginGuard />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/forgot-password', element: <ForgotPassword /> },
      { path: '/reset-password', element: <ResetPassword /> },
    ],
  },

  // Change password route (protected, but only accessible when mustChangePassword is true)
  {
    element: <ChangePasswordGuard />,
    children: [
      { path: '/change-password', element: <ChangePassword /> },
    ],
  },

  // Protected routes (auth guard redirects unauthenticated users to login)
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Root redirect — send to role landing page
          { index: true, element: <RootRedirect /> },

          // Admin-only routes
          {
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [
              { path: '/admin', element: <Navigate to="/admin/users" replace /> },
              { path: '/admin/users', element: <UserManagement /> },
              { path: '/admin/config', element: <SystemConfig /> },
              { path: '/admin/audit-log', element: <AuditLog /> },
            ],
          },

          // Shared routes
          { path: '/employees', element: <PlaceholderPage title="Employees" /> },
          { path: '/projects', element: <PlaceholderPage title="Projects" /> },
          { path: '/dashboards/executive', element: <PlaceholderPage title="Executive Dashboard" /> },
          { path: '/dashboards/department', element: <PlaceholderPage title="Department Dashboard" /> },
        ],
      },
    ],
  },
]);
