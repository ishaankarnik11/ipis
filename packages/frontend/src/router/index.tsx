import { createBrowserRouter, Navigate } from 'react-router';
import { Typography } from 'antd';
import type { UserRole } from '@ipis/shared';
import { AuthGuard, LoginGuard, RoleGuard } from './guards';
import AppLayout from '../layouts/AppLayout';
import Login from '../pages/auth/Login';
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
              { path: '/admin/users', element: <PlaceholderPage title="User Management" /> },
              { path: '/admin/config', element: <PlaceholderPage title="System Configuration" /> },
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
