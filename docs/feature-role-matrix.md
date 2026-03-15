# Feature-Role Matrix — IPIS RBAC Source of Truth

**Generated:** 2026-03-14
**Story:** 10.1 — RBAC Audit & Simplification
**Roles:** ADMIN, FINANCE, HR, DELIVERY_MANAGER (DM), DEPT_HEAD (DH)

---

## 1. Intended Feature-Role Matrix (from PRD)

Source: `_bmad-output/planning-artifacts/prd.md`, lines 275–293

| Feature / Access | Admin | Finance | HR | DM | DH |
|---|:---:|:---:|:---:|:---:|:---:|
| User Management (RBAC module) | **Full** | - | - | - | - |
| System Configuration | **Full** | - | - | - | - |
| Pending Approvals View | **Full** | - | - | - | - |
| Audit Log | **Full** | - | - | - | - |
| Employee Master — bulk upload | - | - | **Yes** | - | - |
| Employee Master — add / edit / resign | - | - | **Yes** | - | - |
| Timesheet Upload | - | **Yes** | - | - | - |
| Billing / Revenue Upload | - | **Yes** | - | - | - |
| % Completion Entry (Fixed Cost) | - | **Yes** | - | **Own** | - |
| Project Creation | - | - | - | **Own** | - |
| Project Approval / Rejection | **Yes** | - | - | - | - |
| Executive Dashboard | **All** | **All** | - | - | - |
| Project Dashboard | **All** | **All** | - | **Own** | **Dept** |
| Employee Dashboard | **All** | **All** | - | - | **Own** |
| Department Dashboard | **All** | **All** | - | **Own** | **Own** |
| Export Reports (PDF) | **Yes** | **Yes** | - | - | - |
| Shareable Report Links | **Yes** | **Yes** | - | - | - |

**Data scoping rules (PRD, enforced at API level):**
- DM: project data filtered to projects where they are assigned as PM
- DH: employee data filtered to their department; project data filtered to department projects
- Finance: all revenue, cost, profitability; individual salary CTC not exposed (aggregated only)
- HR: employee master management only — no dashboards, profitability, or financial reports

---

## 2. Current-State Matrix — Backend API Endpoints

### 2a. Public / Auth-Only Endpoints (no RBAC)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/v1/health` | None | Health check |
| POST | `/api/v1/auth/login` | None (rate-limited) | Login |
| POST | `/api/v1/auth/logout` | None | Logout |
| POST | `/api/v1/auth/forgot-password` | None (rate-limited) | Password reset request |
| GET | `/api/v1/auth/validate-reset-token` | None | Token validation |
| POST | `/api/v1/auth/reset-password` | None | Password reset |
| GET | `/api/v1/auth/me` | Auth only | Current user |
| POST | `/api/v1/auth/change-password` | Auth only | Change password |
| GET | `/api/v1/reports/shared/:token` | None (rate-limited) | Public shared report |
| GET | `/api/v1/project-roles` | Auth only | List project roles (reference data) |
| GET | `/api/v1/uploads/latest-by-type` | Auth only | Latest upload timestamps |

### 2b. RBAC-Protected Endpoints

#### User Management

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/v1/users` | ADMIN | Create user |
| GET | `/api/v1/users` | ADMIN | List users |
| PATCH | `/api/v1/users/:id` | ADMIN | Update user |

#### System Configuration

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/v1/config` | ADMIN | Get config |
| PUT | `/api/v1/config` | ADMIN | Update config |

#### Departments

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/v1/departments` | ADMIN, HR, FINANCE | Reference data for forms |

#### Employees

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/v1/employees/bulk-upload` | HR | Bulk upload salary master |
| GET | `/api/v1/employees/sample-template` | HR | Download HR sample template |
| POST | `/api/v1/employees` | HR | Create individual employee |
| GET | `/api/v1/employees/search` | DM, ADMIN | Search for team member assignment |
| GET | `/api/v1/employees` | HR, ADMIN, FINANCE, DM | List employees (service-layer scoping) |
| GET | `/api/v1/employees/:id` | HR, ADMIN, FINANCE | Get single employee |
| PATCH | `/api/v1/employees/:id` | HR | Update employee |
| PATCH | `/api/v1/employees/:id/resign` | HR | Mark resigned |

#### Projects

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/v1/projects` | DM | Create project |
| GET | `/api/v1/projects` | ADMIN, FINANCE, DM, DH | List (service-layer scoping) |
| GET | `/api/v1/projects/:id` | ADMIN, FINANCE, DM, DH | Detail (service-layer scoping) |
| PATCH | `/api/v1/projects/:id` | DM, FINANCE | Update (% completion) |
| POST | `/api/v1/projects/:id/approve` | ADMIN | Approve |
| POST | `/api/v1/projects/:id/reject` | ADMIN | Reject |
| POST | `/api/v1/projects/:id/resubmit` | DM | Resubmit (ownership check) |
| POST | `/api/v1/projects/:id/team-members` | DM, ADMIN | Add team member |
| GET | `/api/v1/projects/:id/team-members` | DM, ADMIN, FINANCE, DH | List team members |
| DELETE | `/api/v1/projects/:id/team-members/:eid` | DM, ADMIN | Remove team member |

#### Project Roles

| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/v1/project-roles` | ADMIN | Create role |
| PATCH | `/api/v1/project-roles/:id` | ADMIN | Update role |

#### Uploads

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/v1/uploads/templates/:type` | FINANCE, HR, ADMIN, DM | Download template |
| GET | `/api/v1/uploads/history` | FINANCE, HR, ADMIN, DM | Upload event history (role-filtered) |
| POST | `/api/v1/uploads/timesheets` | FINANCE, ADMIN, DM | Upload timesheet |
| POST | `/api/v1/uploads/billing` | FINANCE, ADMIN | Upload billing/revenue |
| POST | `/api/v1/uploads/salary` | HR, ADMIN | Upload salary master |
| GET | `/api/v1/uploads/:id/error-report` | FINANCE, HR, ADMIN, DM | Download error report |
| GET | `/api/v1/uploads/progress/:id` | FINANCE, ADMIN, DM | SSE upload progress |

#### Audit Log

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/v1/audit-log` | ADMIN | List audit events |

#### Dashboards

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/v1/reports/dashboards/projects` | FINANCE, ADMIN, DM, DH | Project dashboard |
| GET | `/api/v1/reports/dashboards/executive` | FINANCE, ADMIN | Executive dashboard |
| GET | `/api/v1/reports/dashboards/practice` | FINANCE, ADMIN | Practice dashboard |
| GET | `/api/v1/reports/dashboards/department` | FINANCE, ADMIN, DH, DM | Department dashboard |
| GET | `/api/v1/reports/dashboards/company` | FINANCE, ADMIN | Company dashboard |
| GET | `/api/v1/reports/dashboards/employees` | FINANCE, ADMIN, DH, HR | Employee dashboard (HR: utilization only, financials zeroed) |
| GET | `/api/v1/reports/dashboards/employees/:id` | FINANCE, ADMIN, DH, HR | Employee detail (HR: financials zeroed) |

#### Ledger & Reports

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/v1/reports/projects/:id/ledger` | FINANCE, ADMIN, DM | Project ledger detail |
| POST | `/api/v1/reports/export/pdf` | FINANCE, ADMIN, DM | PDF export |
| POST | `/api/v1/reports/share` | FINANCE, ADMIN | Create shareable link |
| DELETE | `/api/v1/reports/share/:tokenId` | ADMIN | Revoke share link |

---

## 3. Current-State Matrix — Frontend Routes

| Path | RoleGuard | Component |
|---|---|---|
| `/login` | LoginGuard (public) | Login |
| `/forgot-password` | LoginGuard (public) | ForgotPassword |
| `/reset-password` | LoginGuard (public) | ResetPassword |
| `/reports/shared/:token` | None (public) | SharedReport |
| `/change-password` | ChangePasswordGuard | ChangePassword |
| `/admin/users` | ADMIN | UserManagement |
| `/admin/config` | ADMIN | SystemConfig |
| `/admin/pending-approvals` | ADMIN | PendingApprovals |
| `/admin/audit-log` | ADMIN | AuditLog |
| `/employees` | (redirect) | → `/dashboards/employees` |
| `/uploads` | HR, FINANCE, ADMIN, DM | UploadCenter |
| `/projects/new` | DM | CreateEditProject |
| `/projects/:id/edit` | DM | CreateEditProject |
| `/projects` | ADMIN, FINANCE, DM, DH | ProjectList |
| `/projects/:id` | ADMIN, FINANCE, DM, DH | ProjectDetail |
| `/dashboards/projects` | FINANCE, ADMIN, DM, DH | ProjectDashboard |
| `/dashboards/executive` | FINANCE, ADMIN | ExecutiveDashboard |
| `/dashboards/company` | FINANCE, ADMIN | CompanyDashboard |
| `/dashboards/department` | FINANCE, ADMIN, DH, DM | DepartmentDashboard |
| `/dashboards/employees` | FINANCE, ADMIN, DH, HR | EmployeeDashboard |
| `/dashboards/employees/:id` | FINANCE, ADMIN, DH, HR | EmployeeDetail |

---

## 4. Current-State Matrix — Sidebar Navigation

Source: `packages/frontend/src/config/navigation.ts` and `packages/e2e/helpers/constants.ts`

**Status: Frontend config and E2E constants are 100% consistent.**

| Sidebar Item | Admin | Finance | HR | DM | DH |
|---|:---:|:---:|:---:|:---:|:---:|
| User Management | x | | | | |
| Pending Approvals | x | | | | |
| System Config | x | | | | |
| Employees | x | x | x | | |
| Upload Center | x | x | x | x | |
| Projects | x | x | | x | x |
| Project Dashboard | x | x | | x | x |
| Executive Dashboard | x | x | | | |
| Company Dashboard | x | x | | | |
| Dept Dashboard | x | x | | x | x |
| Employee Dashboard | x | x | x | | x |

**Per-role sidebar totals:**
- ADMIN: 11 items
- FINANCE: 8 items
- HR: 3 items (Employees, Upload Center, Employee Dashboard)
- DM: 4 items (Projects, Project Dashboard, Dept Dashboard, Upload Center)
- DH: 4 items (Projects, Project Dashboard, Dept Dashboard, Employee Dashboard)

---

## 5. Discrepancy Table

### Over-Permissions (current grants access beyond PRD intent)

| ID | Feature / Endpoint | Current Roles | PRD Expected | Severity | Notes |
|---|---|---|---|---|---|
| OP-1 | POST `/uploads/timesheets` | FINANCE, **ADMIN** | FINANCE | Low | Admin has upload access; PRD matrix shows Admin ❌. Likely intentional defensive choice — Admin can step in if Finance unavailable. |
| OP-2 | POST `/uploads/billing` | FINANCE, **ADMIN** | FINANCE | Low | Same as OP-1. |
| OP-3 | POST `/uploads/salary` | HR, **ADMIN** | HR | Low | Same as OP-1 for salary data. |
| OP-4 | POST `/reports/export/pdf` | FINANCE, ADMIN, **DM** | FINANCE, ADMIN | Medium | DM can export PDFs but PRD restricts this to Finance + Admin only (FR41). |
| OP-5 | GET `/uploads/latest-by-type` | All authenticated | Should be role-scoped | Low | Any logged-in user sees upload recency. Low-risk informational endpoint. |
| OP-6 | Upload Center sidebar + route | HR, FINANCE, **ADMIN** | HR + FINANCE (Admin not explicitly in upload role) | Low | Admin Upload Center access is defensive; aligns with "full access" brief description. |

### Under-Permissions (current blocks access the PRD or personas intend)

| ID | Feature | Current Roles | Expected | Severity | Remediation |
|---|---|---|---|---|---|
| UP-1 | Employee Dashboard — HR access | FINANCE, ADMIN, DH, **HR** | ~~Add HR~~ | ~~Medium~~ | **Resolved — Story 10.2** (HR sees utilization, financials zeroed) |
| UP-2 | Upload Center sidebar — DM access | HR, FINANCE, ADMIN, **DM** | ~~Add DM~~ | ~~Medium~~ | **Resolved — Story 10.3** (DM sees Timesheet zone only) |
| UP-3 | Timesheet upload — DM access | FINANCE, ADMIN, **DM** | ~~Add DM~~ | ~~Medium~~ | **Resolved — Story 10.3** (DM can upload timesheets) |
| UP-4 | Upload progress SSE — HR access | FINANCE, ADMIN | Add HR | Low | HR uploads salary data but cannot see SSE progress. Minor UX gap. |

### Clarification Notes

| ID | Item | Notes |
|---|---|---|
| CN-1 | Admin upload access (OP-1/2/3/6) | PRD matrix shows Admin ❌ for uploads, but product brief says "Full access." Current implementation grants Admin upload access defensively. Recommend keeping — Admin should be able to perform any operation in an emergency. Document as intentional deviation from PRD matrix. |
| CN-2 | DM PDF export (OP-4) | DM was added during Epic 7 implementation. PRD FR41 says "Finance and Admin can export." Recommend removing DM from PDF export to match PRD, or updating PRD if this is desired. |
| CN-3 | Employee list — DM access | GET `/employees` includes DM for team member search context (FR57). Not in PRD employee master section but justified by team assignment workflow. |
| CN-4 | Project roles — all authenticated read | GET `/project-roles` is auth-only (no RBAC). Needed as reference data for team member forms. Low risk. |
| CN-5 | UP-1 and UP-2 are persona-driven | The PRD matrix does NOT grant HR Employee Dashboard or DM Upload Center. These are gaps identified by personas during Story 10.1 review and represent desired PRD amendments, not implementation bugs. |

---

## 6. Remediation Plan

### Story 10.2 — HR Gets Employee Dashboard + Utilization Access
- Resolves: **UP-1**
- Changes: Add HR to Employee Dashboard backend route, frontend RoleGuard, and sidebar navigation
- PRD impact: Amends the Feature-Role Matrix to grant HR Employee Dashboard (read-only, no financial data)

### Story 10.3 — DM Gets Upload Center Access (Timesheet Upload)
- Resolves: **UP-2**, **UP-3**
- Changes: Add DM to Upload Center sidebar, frontend route, and timesheet upload backend endpoint
- PRD impact: Amends the Feature-Role Matrix to grant DM timesheet upload capability

### Deferred / Low Priority
- **OP-4** (DM PDF export): Evaluate whether to remove DM from PDF export or update PRD. Low urgency.
- **OP-5** (latest-by-type auth-only): Consider adding RBAC. Very low urgency — informational endpoint only.
- **UP-4** (HR upload progress): Add HR to SSE progress endpoint when Story 10.3 addresses upload permissions.

---

## 7. Complete Role Access Summary

### ADMIN (11 sidebar items, full system access)
- **Sidebar:** User Management, Pending Approvals, System Config, Employees, Upload Center, Projects, Project Dashboard, Executive Dashboard, Company Dashboard, Dept Dashboard, Employee Dashboard
- **API access:** All endpoints (directly via RBAC or implicitly as system owner)
- **Data scope:** All data, all projects, all departments

### FINANCE (8 sidebar items, financial intelligence focus)
- **Sidebar:** Employees, Upload Center, Projects, Project Dashboard, Executive Dashboard, Company Dashboard, Dept Dashboard, Employee Dashboard
- **API access:** All dashboards, all uploads (timesheet + billing), PDF export, share links, employee list (read)
- **Data scope:** All projects, all financial data; individual salary CTC not exposed (aggregated only)

### HR (3 sidebar items, employee master + utilization)
- **Sidebar:** Employees, Upload Center, Employee Dashboard
- **API access:** Employee CRUD + bulk upload, salary upload, upload templates/history/error-reports, employee dashboard (utilization only — financials zeroed by backend)
- **Data scope:** Employee records + utilization metrics; no financial profitability, no revenue/cost/margin

### DELIVERY_MANAGER (4 sidebar items, project delivery focus)
- **Sidebar:** Projects, Project Dashboard, Dept Dashboard, Upload Center
- **API access:** Project CRUD (own), team member management, employee search, % completion, project/dept dashboards, timesheet upload, upload history (TIMESHEET-type only)
- **Data scope:** Own projects only (service-layer filtering); upload history filtered to TIMESHEET type

### DEPT_HEAD (4 sidebar items, department oversight)
- **Sidebar:** Projects, Project Dashboard, Dept Dashboard, Employee Dashboard
- **API access:** Project list/detail (dept), team member list (dept), employee dashboard (dept), dept dashboard (dept)
- **Data scope:** Own department projects and employees only (service-layer filtering)
