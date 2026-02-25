export const E2E_DB_URL = 'postgresql://ipis:ipis_dev@localhost:5432/ipis_test_e2e';

export const DEFAULT_PASSWORD = 'Test1234!';
export const TEMP_PASSWORD = 'Temp1234!';

export type Role = 'ADMIN' | 'HR' | 'FINANCE' | 'DELIVERY_MANAGER' | 'DEPT_HEAD';

export const credentials: Record<Role, { email: string; password: string }> = {
  ADMIN: { email: 'admin@e2e.test', password: DEFAULT_PASSWORD },
  HR: { email: 'hr@e2e.test', password: DEFAULT_PASSWORD },
  FINANCE: { email: 'finance@e2e.test', password: DEFAULT_PASSWORD },
  DELIVERY_MANAGER: { email: 'dm@e2e.test', password: DEFAULT_PASSWORD },
  DEPT_HEAD: { email: 'depthead@e2e.test', password: DEFAULT_PASSWORD },
};

/** Expected sidebar labels per role */
export const roleSidebarItems: Record<Role, string[]> = {
  ADMIN: ['User Management', 'Pending Approvals', 'System Config', 'Employees', 'Projects', 'Executive Dashboard', 'Department Dashboard'],
  HR: ['Employees', 'Upload Center'],
  FINANCE: ['Employees', 'Projects', 'Executive Dashboard', 'Department Dashboard'],
  DELIVERY_MANAGER: ['Projects', 'Department Dashboard'],
  DEPT_HEAD: ['Projects', 'Department Dashboard'],
};

/** Expected landing page per role */
export const roleLandingPage: Record<Role, string> = {
  ADMIN: '/admin',
  HR: '/employees',
  FINANCE: '/dashboards/executive',
  DELIVERY_MANAGER: '/projects',
  DEPT_HEAD: '/dashboards/department',
};
