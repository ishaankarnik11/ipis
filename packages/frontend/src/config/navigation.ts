import type { ReactNode } from 'react';
import { createElement } from 'react';
import {
  UserOutlined,
  SettingOutlined,
  TeamOutlined,
  ProjectOutlined,
  DashboardOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UserRole } from '@ipis/shared';

export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  roles: UserRole[];
}

export const navItems: NavItem[] = [
  { key: 'admin-users', label: 'User Management', path: '/admin/users', icon: createElement(UserOutlined), roles: ['ADMIN'] },
  { key: 'admin-pending', label: 'Pending Approvals', path: '/admin/pending-approvals', icon: createElement(ProjectOutlined), roles: ['ADMIN'] },
  { key: 'admin-config', label: 'System Config', path: '/admin/config', icon: createElement(SettingOutlined), roles: ['ADMIN'] },
  { key: 'employees', label: 'Employees', path: '/employees', icon: createElement(TeamOutlined), roles: ['HR', 'ADMIN', 'FINANCE'] },
  { key: 'uploads', label: 'Upload Center', path: '/uploads', icon: createElement(UploadOutlined), roles: ['HR', 'FINANCE', 'ADMIN'] },
  { key: 'projects', label: 'Projects', path: '/projects', icon: createElement(ProjectOutlined), roles: ['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD'] },
  { key: 'dashboards-projects', label: 'Project Dashboard', path: '/dashboards/projects', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN', 'DELIVERY_MANAGER', 'DEPT_HEAD'] },
  { key: 'dashboards-exec', label: 'Executive Dashboard', path: '/dashboards/executive', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN'] },
  { key: 'dashboards-company', label: 'Company Dashboard', path: '/dashboards/company', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN'] },
  { key: 'dashboards-dept', label: 'Department Dashboard', path: '/dashboards/department', icon: createElement(DashboardOutlined), roles: ['DEPT_HEAD', 'ADMIN', 'FINANCE', 'DELIVERY_MANAGER'] },
  { key: 'dashboards-employees', label: 'Employee Dashboard', path: '/dashboards/employees', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN', 'DEPT_HEAD'] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
