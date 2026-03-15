import { createBrowserRouter, Navigate } from 'react-router';
import type { UserRole } from '@ipis/shared';
import { AuthGuard, LoginGuard, RoleGuard } from './guards';
import AppLayout from '../layouts/AppLayout';
import Login from '../pages/auth/Login';
import AcceptInvitation from '../pages/auth/AcceptInvitation';
import UserManagement from '../pages/admin/UserManagement';
import SystemConfig from '../pages/admin/SystemConfig';
import AuditLog from '../pages/admin/AuditLog';
import PendingApprovals from '../pages/admin/PendingApprovals';
import DepartmentManagement from '../pages/admin/DepartmentManagement';
import UploadCenter from '../pages/upload/UploadCenter';
import CreateEditProject from '../pages/projects/CreateEditProject';
import ProjectList from '../pages/projects/ProjectList';
import ProjectDetail from '../pages/projects/ProjectDetail';
import ProjectDashboard from '../pages/dashboards/ProjectDashboard';
import ExecutiveDashboard from '../pages/dashboards/ExecutiveDashboard';
import DepartmentDashboard from '../pages/dashboards/DepartmentDashboard';
import CompanyDashboard from '../pages/dashboards/CompanyDashboard';
import EmployeeDashboard from '../pages/dashboards/EmployeeDashboard';
import EmployeeDetail from '../pages/dashboards/EmployeeDetail';
import ClientDashboard from '../pages/dashboards/ClientDashboard';
import SharedReport from '../pages/reports/SharedReport';
import { useAuth, getRoleLandingPage } from '../hooks/useAuth';

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

  // Public shared report page (no auth required)
  { path: '/reports/shared/:token', element: <SharedReport /> },

  // Public invitation acceptance page (no auth required)
  { path: '/accept-invitation/:token', element: <AcceptInvitation /> },

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
              { path: '/admin/departments', element: <DepartmentManagement /> },
              { path: '/admin/config', element: <SystemConfig /> },
              { path: '/admin/pending-approvals', element: <PendingApprovals /> },
              { path: '/admin/audit-log', element: <AuditLog /> },
            ],
          },

          // Legacy /employees redirect → unified Employee Dashboard
          { path: '/employees', element: <Navigate to="/dashboards/employees" replace /> },

          // Upload Center (HR, Finance, Admin, DM)
          {
            element: <RoleGuard allowedRoles={['HR', 'FINANCE', 'ADMIN', 'DELIVERY_MANAGER']} />,
            children: [
              { path: '/uploads', element: <UploadCenter /> },
            ],
          },
          // Project routes (Delivery Manager creates/edits; detail visible to all project roles)
          {
            element: <RoleGuard allowedRoles={['DELIVERY_MANAGER']} />,
            children: [
              { path: '/projects/new', element: <CreateEditProject /> },
              { path: '/projects/:id/edit', element: <CreateEditProject /> },
            ],
          },
          // Legacy /projects redirect → unified Project Dashboard
          { path: '/projects', element: <Navigate to="/dashboards/projects" replace /> },
          {
            element: <RoleGuard allowedRoles={['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD']} />,
            children: [
              { path: '/projects/:id', element: <ProjectDetail /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['FINANCE', 'ADMIN', 'DELIVERY_MANAGER', 'DEPT_HEAD']} />,
            children: [
              { path: '/dashboards/projects', element: <ProjectDashboard /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['FINANCE', 'ADMIN']} />,
            children: [
              { path: '/dashboards/executive', element: <ExecutiveDashboard /> },
              { path: '/dashboards/company', element: <CompanyDashboard /> },
              { path: '/dashboards/clients', element: <ClientDashboard /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['FINANCE', 'ADMIN', 'DEPT_HEAD', 'DELIVERY_MANAGER', 'HR']} />,
            children: [
              { path: '/dashboards/department', element: <DepartmentDashboard /> },
            ],
          },
          {
            element: <RoleGuard allowedRoles={['FINANCE', 'ADMIN', 'DEPT_HEAD', 'HR']} />,
            children: [
              { path: '/dashboards/employees', element: <EmployeeDashboard /> },
              { path: '/dashboards/employees/:id', element: <EmployeeDetail /> },
            ],
          },
        ],
      },
    ],
  },
]);
