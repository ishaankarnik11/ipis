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
  { key: 'admin-config', label: 'System Config', path: '/admin/config', icon: createElement(SettingOutlined), roles: ['ADMIN'] },
  { key: 'employees', label: 'Employees', path: '/employees', icon: createElement(TeamOutlined), roles: ['HR', 'ADMIN', 'FINANCE'] },
  { key: 'uploads', label: 'Upload Center', path: '/uploads', icon: createElement(UploadOutlined), roles: ['HR'] },
  { key: 'projects', label: 'Projects', path: '/projects', icon: createElement(ProjectOutlined), roles: ['ADMIN', 'FINANCE', 'DELIVERY_MANAGER', 'DEPT_HEAD'] },
  { key: 'dashboards-exec', label: 'Executive Dashboard', path: '/dashboards/executive', icon: createElement(DashboardOutlined), roles: ['FINANCE', 'ADMIN'] },
  { key: 'dashboards-dept', label: 'Department Dashboard', path: '/dashboards/department', icon: createElement(DashboardOutlined), roles: ['DEPT_HEAD', 'ADMIN', 'FINANCE', 'DELIVERY_MANAGER'] },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter((item) => item.roles.includes(role));
}
