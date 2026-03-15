export const E2E_DB_URL = 'postgresql://ipis:ipis_dev@localhost:5432/ipis_test_e2e';

export type Role = 'ADMIN' | 'HR' | 'FINANCE' | 'DELIVERY_MANAGER' | 'DEPT_HEAD' | 'DM2';

export const credentials: Record<Role, { email: string }> = {
  ADMIN: { email: 'admin@e2e.test' },
  HR: { email: 'hr@e2e.test' },
  FINANCE: { email: 'finance@e2e.test' },
  DELIVERY_MANAGER: { email: 'dm@e2e.test' },
  DEPT_HEAD: { email: 'depthead@e2e.test' },
  DM2: { email: 'dm2@e2e.test' },
};

/** Expected sidebar labels per role */
export const roleSidebarItems: Record<Role, string[]> = {
  ADMIN: ['User Management', 'Pending Approvals', 'Departments', 'System Config', 'Upload Center', 'Projects', 'Executive Dashboard', 'Company Dashboard', 'Dept Dashboard', 'Client Dashboard', 'Employees'],
  HR: ['Upload Center', 'Dept Dashboard', 'Employees'],
  FINANCE: ['Upload Center', 'Projects', 'Executive Dashboard', 'Company Dashboard', 'Dept Dashboard', 'Client Dashboard', 'Employees'],
  DELIVERY_MANAGER: ['Upload Center', 'Projects', 'Dept Dashboard'],
  DEPT_HEAD: ['Projects', 'Dept Dashboard', 'Employees'],
  DM2: ['Upload Center', 'Projects', 'Dept Dashboard'],
};

/** Expected landing page per role */
export const roleLandingPage: Record<Role, string> = {
  ADMIN: '/admin',
  HR: '/dashboards/employees',
  FINANCE: '/dashboards/executive',
  DELIVERY_MANAGER: '/dashboards/projects',
  DEPT_HEAD: '/dashboards/department',
  DM2: '/dashboards/projects',
};
