import type { ReactNode } from 'react';
import { createElement } from 'react';
import {
  UserOutlined,
  SettingOutlined,
  TeamOutlined,
  ProjectOutlined,
  DashboardOutlined,
  UploadOutlined,
  ApartmentOutlined,
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
  { key: 'admin-depts', label: 'Departments', path: '/admin/departments', icon: createElement(ApartmentOutlined), roles: ['ADMIN'] },
  { key: 'admin-config', label: 'System Config', path: '/admin/config', icon: createElement(SettingOutlined), roles: ['ADMIN'] },
  { key: 'uploads', label: 'Upload Center', path: '/uploads', icon: createElement(UploadOutlined), roles: ['HR', 'FINANCE', 'ADMIN', 'DELIVERY_MANAGER'] },
  { key: 'dashboards-projects', label: 'Projects', path: '/dashboards/projects', icon: createElement(ProjectOutlined), roles: ['FINANCE', 'ADMIN', 'DELIVERY_MANAGER', 'DEPT_HEAD'] },
  { key: 'dashboards-exec', label: 'Executive Dashboard', path: '/dashboards/executive', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN'] },
  { key: 'dashboards-company', label: 'Company Dashboard', path: '/dashboards/company', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN'] },
  { key: 'dashboards-dept', label: 'Dept Dashboard', path: '/dashboards/department', icon: createElement(DashboardOutlined), roles: ['DEPT_HEAD', 'ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'HR'] },
  { key: 'dashboards-clients', label: 'Client Dashboard', path: '/dashboards/clients', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN'] },
  { key: 'dashboards-employees', label: 'Employees', path: '/dashboards/employees', icon: createElement(TeamOutlined), roles: ['FINANCE', 'ADMIN', 'DEPT_HEAD', 'HR'] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
