---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
workflowStatus: complete
completedDate: 2026-02-23
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-BMAD_101-2026-02-23.md
  - docs/requirements/raw_requirements.md
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 1
classification:
  projectType: Internal Web App (B2B Enterprise)
  domain: Internal Financial Intelligence
  complexity: medium
  projectContext: greenfield
  techStack: React + ExpressJS + PostgreSQL + AWS
  tenancy: single-tenant
  compliance: audit trails (good practice); no regulatory requirements for v1
  keyDesignPrinciple: Calculation explainability + synchronous upload feedback
---

# Product Requirements Document - BMAD_101

**Author:** Dell
**Date:** 2026-02-23

## Executive Summary

IPIS (Internal Profitability Intelligence System) is a greenfield internal web application that centralises project profitability intelligence for an IT services company's leadership and accounts team. It replaces a fragmented, PM-dependent Excel workflow — where producing a single profitability report takes approximately one day and yields results leadership cannot fully trust — with an upload-triggered system that recalculates profitability on demand across all active projects in under one hour.

The primary beneficiary is leadership. IPIS gives them an on-demand, reliable view of portfolio profitability — across projects, practices, departments, and the company — without depending on individual PM diligence or manual report assembly. The accounts team (Priya) is the primary operator: she uploads data, reviews reports, and surfaces intelligence to leadership. HR (Ravi) manages the employee salary master that underlies every calculation. Delivery Managers (Arjun) create and maintain project records. Leadership holds admin access and approves new projects before they enter the reporting pipeline.

IPIS ingests three Excel-based inputs — an annual employee salary master, variable-cadence timesheets, and project revenue/billing records — and recalculates profitability on every upload. Profitability is surfaced at four levels: project, practice/discipline, department, and company-wide. All four engagement models are supported with distinct revenue-cost logic: T&M, Fixed Cost, AMC, and Infrastructure.

The deeper problem IPIS solves is not data availability — timesheets and salary records already exist. The problem is the friction, inconsistency, and accountability gaps in assembling that data into a trustworthy picture. IPIS removes the friction and centralises accountability. When leadership asks "are we profitable on this project?", the answer is already there.

### What Makes This Special

**Variable upload cadence:** Upload frequency flexes with project risk level. A project under scrutiny gets daily uploads and near-real-time cost visibility; steady projects get monthly reviews. This is what makes early warning credible — the system adapts to urgency rather than forcing a fixed reporting rhythm.

**Four distinct engagement model logics:** T&M, Fixed Cost, AMC, and Infrastructure each have purpose-built revenue-cost calculation models — not a generic template adapted to fit. Each reflects the actual commercial logic of that engagement type.

**Practice-level cost attribution:** Beyond project P&L, IPIS surfaces how much each discipline (Python, Frontend, QA, etc.) contributed to a project's internal cost, and how much revenue each practice generates across the portfolio. Which practices are consistent contributors vs. cost centres — answered at a glance.

**Calculation explainability:** Users can trace how any profitability figure was derived — not just see a number. Priya can stand behind the output because she can explain it. Leadership can act on it for the same reason.

**Internal cost model fidelity:** Uses the company's actual cost structure — Annual CTC + ₹1,80,000 universal overhead ÷ configurable standard monthly working hours (default: 160 hrs).

## Project Classification

| Dimension | Value |
|---|---|
| **Project Type** | Internal Web Application (single-tenant, enterprise) |
| **Domain** | Internal Financial Intelligence |
| **Complexity** | Medium — multi-model calculation engine, RBAC, multi-dimensional reporting |
| **Project Context** | Greenfield — forward-looking from go-live, no historical data migration |
| **Tech Stack** | React · ExpressJS · PostgreSQL · AWS |
| **Compliance** | Internal audit trails (good practice); no regulatory requirements for v1 |

## Success Criteria

### User Success

- Priya (Accounts Executive) can go from timesheet upload to a shareable profitability report in ≤ 1 hour
- All active projects display a profitability verdict with drill-down detail available on every upload cycle
- Fixed-cost projects surface real-time cost vs. % completion on every upload — visible before the project crosses the point of no return
- Zero timesheet entries logged against projects where the resource is not formally assigned
- All 5 user roles can log in and access their appropriate views with correct data scoping

**Adoption signal:** The accounts team stops producing manual Excel profitability reports. Leadership routes all profitability questions through IPIS output — not through PMs.

### Business Success

**3-Month Target — "This was worth building":**
- Fixed-cost projects are not silently overrunning — cost vs. % completion visible before the point of no return
- No resources working on projects they are not formally assigned to — invisible cost leakage eliminated
- Accounts team using IPIS as primary profitability tool; Excel retired from this workflow

**12-Month Direction:**
- Measurable improvement in gross margins on fixed-cost and T&M projects attributable to earlier cost visibility and faster CR recovery
- IPIS embedded in the company's standard operating rhythm — profitability review is a regular, data-driven process, not an ad hoc exercise

### Technical Success

- All 4 engagement model calculations produce correct results validated against manual Excel
- Dashboard pages load in under 1 second
- All core features covered by passing automated tests
- CI/CD pipeline operational from day one
- Internal audit trail captures all key system events: data uploads, project creation, project approval/rejection, % completion edits

### Measurable Outcomes

**Operational KPIs (tracked from launch):**

| KPI | Target |
|---|---|
| Upload to shareable report | ≤ 1 hour |
| Dashboard page load time | < 1 second |
| Active projects with timesheet data within last 30 days | 100% |
| Active projects with all required fields populated | 100% within 30 days of launch |
| Timesheet entries against unassigned resources | 0 |

**Business KPIs (tracked from 3 months):**

| KPI | Target |
|---|---|
| Fixed-cost project overrun rate | Measurable reduction vs. pre-IPIS baseline |
| CR recovery rate (raised within lifecycle vs. after) | Improvement vs. baseline |
| Gross margin trend | Upward direction within 6 months |

## Product Scope

### MVP — Minimum Viable Product

- Data ingestion: Employee salary master (bulk Excel + individual form), timesheet upload (variable cadence), revenue/billing data upload
- Profitability calculation engine: All 4 engagement models (T&M, Fixed Cost, AMC, Infrastructure)
- Project management: Project creation, pending approval workflow, % completion entry for Fixed Cost projects
- Dashboards: Executive, Project, Employee, Department
- Role-based access control: Admin, Finance/Accounts, HR, Delivery Manager, Department Head
- Export & sharing: PDF export, shareable report links
- Internal audit trail: Project creation, approval/rejection, data uploads, % completion edits
- CI/CD pipeline and automated test coverage for all core features

### Growth Features (Post-MVP)

All deferred to v2 — not part of v1 scope:
- Proactive alerting when project cost burn crosses a configurable threshold
- Timesheet system integration: eliminate manual upload
- Budget forecasting based on current run rate and remaining scope
- Expanded cost model: software licenses, hardware depreciation, other overhead

### Vision (Future)

- Predictive profitability modelling based on historical run rates
- Automated change request triggers based on burn thresholds
- Integration with broader finance or ERP systems

## User Journeys

### Journey 1: Priya — Monthly Profitability Report (Success Path)

**Opening Scene:** Last Friday of the month. Priya has just received the monthly timesheet — 400 rows, 12 active projects. In the old world, this file would sit while she spent the next day cross-referencing salary data, chasing PMs for details, and assembling a report leadership may not trust. Today she opens IPIS.

**Rising Action:** She uploads the timesheet via the Finance dashboard. IPIS validates it: all employee IDs match the salary master, all project names match approved projects in the system. Validation passes. She uploads the latest billing records. IPIS recalculates profitability across all 12 projects.

**Climax:** The dashboard refreshes. Two projects have flipped from green to amber. One fixed-cost project shows 78% cost burn at 55% delivery — visible for the first time without a PM flagging it. Priya exports a PDF and sends a shareable link to the CFO before lunch.

**Resolution:** The CFO responds within the hour: "Finally — this is what I needed." Priya spent 45 minutes, not a day. Next month looks the same.

**Capabilities revealed:** Timesheet upload + validation · Billing data upload · Profitability recalculation · Executive dashboard · Project dashboard with burn rate · PDF export · Shareable links

---

### Journey 2: Priya — Upload Validation Failure (Error Path)

**Opening Scene:** Mid-month. A high-priority project is under daily monitoring. Priya downloads the day's timesheet from the ops group and uploads it.

**Rising Action:** IPIS validates the file. Three rows reference a project named "ProjectPhoenix_v2" — which doesn't match any approved project in the system. The approved name is "Project Phoenix." The entire upload is rejected. IPIS displays: *"Upload rejected — 3 rows reference unrecognized project: 'ProjectPhoenix_v2'. Correct the file and re-upload."*

**Climax:** Priya contacts the ops team. They fix the three rows. She re-uploads. All validations pass. Profitability is current.

**Resolution:** The all-or-nothing rule means leadership's view is never partially updated — either the data is complete and accurate, or it isn't there yet. Priya briefs the ops team on exact project naming conventions going forward.

**Capabilities revealed:** Atomic upload validation · Employee ID + project name matching · Full rejection with specific error message · Re-upload flow

---

### Journey 3: Ravi — Annual Salary Master + New Joiner

**Opening Scene:** April — start of the financial year. Ravi has the updated salary master ready: 47 employees. He downloads IPIS's sample template to confirm formatting, then bulk uploads the file.

**Rising Action:** 45 records import immediately. 2 rows fail — one missing designation, one invalid department code. Ravi downloads the failed rows report, corrects both, and re-uploads just those 2. All 47 employees are now live.

Three weeks later a new backend engineer joins. Ravi opens the individual entry form, fills in the details, and submits. The record is live immediately — correct cost rate applied to all future timesheet calculations from that point.

**Climax:** The engineer's salary is revised a month later. Ravi updates the record in under two minutes. Every subsequent calculation reflects the new cost.

**Resolution:** Ravi never touches a profitability report. But the accuracy of every report depends entirely on his data quality — and IPIS makes the job fast enough it never becomes a burden.

**Capabilities revealed:** Bulk salary upload with sample template · Partial import with downloadable failed rows · Individual entry form · Employee edit · Mark as resigned

---

### Journey 4: Arjun — Project Creation, Rejection, and Resubmission

**Opening Scene:** A new fixed-cost project awarded — 6-month municipal engagement, ₹48 lakhs contract value. Arjun logs into IPIS to create the project before the team starts logging hours.

**Rising Action:** He fills in the project creation form: name, client, engagement model (Fixed Cost), contract value, billing structure, team composition, start and end dates. Submitted. The project enters **pending approval** — visible as "Awaiting Admin Review."

The CFO sends it back: *"Contract value appears to be gross — please confirm net of taxes."* Arjun corrects the figure and resubmits. The CFO approves. The project goes live.

**Climax:** Two months in, Arjun checks the practice-level burn. Backend has consumed 61% of budget at 40% delivery. He flags this to Priya, who updates the % completion to 40%. The adjusted calculation makes the gap unmistakable — Arjun raises a change request with the client, backed by IPIS data.

**Resolution:** The CR is approved before project completion. The overrun that would have gone unnoticed until month 6 is caught at month 2.

**Capabilities revealed:** Project creation (all engagement models) · Pending approval state · Admin rejection with comments · Resubmission · Project approval · Practice-level cost breakdown · % completion entry

---

### Journey 5: Admin/Leadership — System Setup + Portfolio Oversight

**Opening Scene:** IPIS just deployed. Before anyone logs in, the Admin (CFO) opens the RBAC module.

**Rising Action:** She creates user accounts: Priya and her colleague (Finance), Ravi (HR), three Delivery Managers, two Department Heads. Each receives credentials. She sets system configuration: standard monthly working hours to 176 — the company's actual figure, not the default 160.

IPIS is now operational. Over the following weeks, projects are created, the salary master is uploaded, and the first timesheet is processed. Pending approvals surface on the Admin dashboard.

**Climax:** Three months in, the Admin logs in Monday morning. Portfolio dashboard: 14 active projects — 9 green, 3 amber, 2 red. Both red projects are fixed-cost; one is at 91% cost burn with 60% delivery. She doesn't wait for a weekly report or ask a PM. She calls the delivery lead before standup.

**Resolution:** IPIS becomes the Monday morning ritual. Portfolio health in one view, under a minute.

**Capabilities revealed:** RBAC module (user creation, role assignment) · System configuration · Pending approvals dashboard · Portfolio dashboard · Shareable report receipt

---

### Journey Requirements Summary

| Journey | Key Capabilities |
|---|---|
| Priya — Success Path | Timesheet upload · Billing upload · Profitability recalc · Dashboards · Export/share |
| Priya — Error Path | Atomic upload validation · Project name + employee ID match · Error message · Re-upload |
| Ravi — HR Data | Bulk salary upload · Partial import + failed row download · Individual entry · Edit · Resign |
| Arjun — Project Lifecycle | Project creation · Pending approval · Rejection/resubmission · Practice burn · % completion |
| Admin/Leadership | RBAC module · System config · Approval dashboard · Portfolio view |

## Domain-Specific Requirements

### Data Sensitivity & Access Control

- Salary data (individual CTC, designation, department) is sensitive — visible only to Admin and Finance roles; HR can manage records but not view profitability output
- Contract values, billing rates, and project revenue data are commercially sensitive — scoped by role (Admin and Finance see all projects; Delivery Managers see only their own projects)
- Profitability figures and practice-level breakdowns are internal intelligence — not accessible to external parties; shareable report links grant read-only access to specific reports, not system access

### Technical Constraints

- **Calculation correctness is a trust requirement:** Errors in profitability output lead directly to wrong business decisions. All 4 engagement model calculations must be validated against manual Excel results before go-live and regression-tested on every change
- **Data integrity via atomic uploads:** Timesheet uploads are all-or-nothing — partial ingestion is not permitted. A failed validation rejects the entire file with a specific, actionable error message
- **Upload trigger model:** Profitability recalculation is synchronous and triggered exclusively by human upload actions. No scheduled jobs, no background processing. Users must receive confirmation when recalculation completes
- **Project name referential integrity:** Timesheet rows must reference project names that exactly match approved projects in the system. Mismatches cause full upload rejection

### Authentication & User Management

- Authentication: Email and password, managed internally by IPIS (no SSO or external identity provider for v1)
- User accounts created and managed by Admin via the RBAC module
- Role assignment determines data visibility scope and feature access across all views

### Data Retention

- No formal retention policy exists for v1 — all uploaded data (timesheets, billing records, salary history) is retained indefinitely
- Future consideration: define a retention and archival policy post-launch once usage patterns are established

### Risk Mitigations

| Risk | Mitigation |
|---|---|
| Calculation errors creating false profitability picture | Acceptance testing validates all 4 models against manual Excel; regression tests on every release |
| Data staleness (outdated timesheets giving false green status) | Upload recency visible on dashboard; 100% data freshness KPI tracked from launch |
| Unauthorised access to salary or financial data | RBAC enforced at API level; role scoping applied to all data queries, not just UI |
| Partial data entry corrupting profitability figures | Atomic upload model — no partial state ever enters the system |
| Project naming inconsistency causing upload failures | Clear error messages with exact mismatch details; onboarding documentation covers naming conventions |

## Technical & Platform Requirements

### Tenancy & Deployment Model

- Single-tenant internal deployment — one instance, one company
- No multi-tenancy, no tenant isolation complexity
- All users operate within the same data namespace; access control is role-scoped, not tenant-scoped
- Hosted on AWS; single environment for production (staging environment for pre-release validation)

### Role-Based Access Control Matrix

| Feature / Access | Admin | Finance | HR | Delivery Manager | Dept Head |
|---|---|---|---|---|---|
| **User Management (RBAC module)** | ✅ Full | ❌ | ❌ | ❌ | ❌ |
| **System configuration** (working hours, etc.) | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Employee master** — bulk upload | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Employee master** — add / edit / resign | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Timesheet upload** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Billing / revenue upload** | ❌ | ✅ | ❌ | ❌ | ❌ |
| **% completion entry** (Fixed Cost) | ❌ | ✅ | ❌ | ✅ Own projects | ❌ |
| **Project creation** | ❌ | ❌ | ❌ | ✅ Own projects | ❌ |
| **Project approval / rejection** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Executive dashboard** (portfolio-wide) | ✅ All | ✅ All | ❌ | ❌ | ❌ |
| **Project dashboard** | ✅ All | ✅ All | ❌ | ✅ Own projects | ✅ Dept projects |
| **Employee dashboard** | ✅ All | ✅ All | ❌ | ❌ | ✅ Own resources |
| **Department dashboard** | ✅ All | ✅ All | ❌ | ✅ Own dept | ✅ Own dept |
| **Export reports (PDF)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Shareable report links** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Pending approvals view** | ✅ | ❌ | ❌ | ❌ | ❌ |

**Data scoping rules enforced at API level (not UI only):**
- Delivery Manager: project data filtered to projects where they are assigned as PM
- Department Head: employee data filtered to their department's resources; project data filtered to their department's projects
- Finance: all revenue, cost, and profitability data across all projects; individual salary CTC not exposed (aggregated cost only)
- HR: employee master management only — no access to dashboards, profitability data, or financial reports

### Technical Architecture Considerations

- **Frontend:** React SPA with client-side routing; role-aware navigation (menu items and routes rendered per role)
- **Backend:** ExpressJS REST API; all data access queries scoped by authenticated user's role and ownership context
- **Database:** PostgreSQL; indexes on project_id, employee_id, upload_date for calculation query performance
- **Authentication:** Email + password; JWT tokens for session management
- **Session management:** Auto-logout after 2 hours of inactivity; token refresh on active use
- **File handling:** Server-side Excel parsing for all uploads; no client-side data processing

### Browser Support

- Modern browsers: Chrome (latest), Edge (latest), Firefox (latest)
- No IE11 or legacy browser support required (internal tool, controlled environment)
- No mobile-responsive requirement for v1 (desktop-first, internal finance tool)

### Integration Requirements

- No external system integrations for v1
- All data ingestion via structured Excel file upload (fixed format templates provided)
- Outbound: PDF export (generated server-side); shareable links (read-only report access, no auth required for link recipients)

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-solving MVP — complete and correct over feature-rich. All 4 engagement models, all 5 user roles, and all core data flows must be fully operational on launch day. Partial functionality is not an option: leadership won't trust an incomplete tool, and Priya won't abandon Excel as a backup until IPIS is demonstrably reliable.

**Team:** 1 backend developer · 1 frontend developer · 1 QA engineer

**MVP constraint:** With a 3-person build team, scope discipline is critical. The defined MVP is achievable but leaves no room for scope creep. A React UI component library reduces frontend effort and removes the need for a dedicated design resource.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:** All 5 journeys (Priya success path, Priya error path, Ravi HR data, Arjun project lifecycle, Admin setup + oversight)

**Must-Have Capabilities:**

| Capability | Notes |
|---|---|
| Email/password authentication + JWT sessions | Auto-logout 2 hrs |
| RBAC module — user creation + role assignment | Admin-only |
| System configuration | Standard working hours (configurable) |
| Employee master — bulk upload + partial import | Failed rows downloadable |
| Employee master — individual add / edit / resign | — |
| Timesheet upload — atomic, variable cadence | Full validation; all-or-nothing |
| Billing / revenue upload | — |
| Profitability calculation engine — all 4 models | T&M, Fixed Cost, AMC, Infrastructure |
| Project creation — all 4 engagement models | Full financial field set |
| Project approval workflow | Pending → Approved / Rejected + resubmission |
| % completion entry | Finance + Delivery Manager (own projects) |
| Executive dashboard | Portfolio-wide; Admin + Finance |
| Project dashboard | Practice-level cost breakdown |
| Employee dashboard | — |
| Department dashboard | — |
| PDF export + shareable report links | Finance + Admin |
| Internal audit trail | Upload events, project creation/approval, % completion edits |
| CI/CD pipeline on AWS | Automated build, test, deploy from day one |

### Post-MVP Features

**Phase 2 (Growth):** See Product Scope section for full roadmap.

### Risk Mitigation Strategy

| Risk | Category | Mitigation |
|---|---|---|
| Calculation engine errors across 4 models | Technical | TDD approach; all models validated against manual Excel in acceptance testing; regression suite on every release |
| Excel parsing edge cases (formatting, encoding, versions) | Technical | Defensive server-side parsing with strict validation; sample templates enforce correct format; specific error messages on rejection |
| Scope creep with a 3-person team | Resource | Hard MVP boundary enforced; all Phase 2 features documented and deferred; no "while we're at it" additions |
| Trust gap — Priya runs parallel Excel checks post-launch | Adoption | Expected and healthy; adoption signal (Excel retired) is a 3-month target, not a launch target; calculation explainability accelerates trust |
| Project name inconsistency breaking uploads | Operational | Clear naming convention documented in onboarding; error messages cite exact mismatch |

## Functional Requirements

### Authentication & Session Management

- **FR1:** Users can log in with email and password
- **FR2:** The system automatically logs out users after 2 hours of inactivity
- **FR3:** Users can manually log out at any time
- **FR4:** The system maintains session state across page navigation during an active session
- **FR49:** Users can request a password reset via email
- **FR50:** Admin-created users receive a temporary password and are prompted to set a new password on first login

### User & Role Management

- **FR5:** Admin can create new user accounts with name, email, and assigned role
- **FR6:** Admin can assign one of five roles to a user: Admin, Finance, HR, Delivery Manager, Department Head
- **FR7:** Admin can edit existing user account details and role assignments
- **FR8:** Admin can deactivate user accounts
- **FR9:** Admin can configure system-wide settings (standard monthly working hours)
- **FR10:** The system restricts access to features and data based on the authenticated user's assigned role, enforced at the data access layer

### Employee Data Management

- **FR11:** HR can bulk upload an employee salary master via Excel using a provided sample template
- **FR12:** The system imports valid employee records immediately from a bulk upload and makes failed rows available as a downloadable report
- **FR13:** HR can re-upload a corrected set of failed rows independently of a prior bulk upload
- **FR14:** HR can add individual employees via a form (employee ID, name, designation, department, annual CTC, joining date)
- **FR15:** HR can edit existing employee details (designation, department, annual CTC)
- **FR16:** HR can mark an employee as resigned

### Data Ingestion

- **FR17:** Finance can upload a timesheet file in the defined Excel format
- **FR18:** The system validates timesheet uploads by checking all employee IDs against the employee master and all project names against approved active projects
- **FR19:** The system rejects a timesheet upload in full if any row fails validation, returning an error message identifying the exact mismatch
- **FR20:** Finance can upload revenue and billing records via Excel (project ID, client name, invoice amount, invoice date, project type, vertical)
- **FR21:** The system triggers a full profitability recalculation across all active projects upon successful completion of any data upload

### Project Management

- **FR22:** Delivery Manager can create a new project with all required fields: name, client, vertical, engagement model (T&M / Fixed Cost / AMC / Infrastructure), contract value, billing rates, team composition, start and end dates
- **FR23:** Newly created projects enter a pending approval state and are excluded from all profitability reports until approved
- **FR24:** Admin can review pending projects and approve or reject them with a written comment
- **FR25:** Delivery Manager can view the rejection reason for their pending project and resubmit with corrections
- **FR26:** Finance can enter and update % completion estimates for active Fixed Cost projects
- **FR27:** Delivery Manager can enter and update % completion estimates for their own active Fixed Cost projects
- **FR28:** The system tracks formal team member assignments per project; timesheet entries for non-assigned employees are rejected during upload validation
- **FR45:** Delivery Manager can view and update the team member roster for their own projects after project approval
- **FR46:** Admin receives an email notification when a Delivery Manager submits a new project for approval
- **FR47:** Delivery Manager receives an email notification when their project submission is approved or rejected

### Profitability Calculation Engine

- **FR29:** The system calculates employee cost per hour as: (Annual CTC + ₹1,80,000 overhead) ÷ 12 ÷ configured standard monthly working hours
- **FR30:** The system calculates T&M project profitability as: Revenue = Billed hours × billing rate; Cost = Employee cost × project hours; Profit = Revenue − Cost
- **FR31:** The system calculates Fixed Cost project profitability as: Revenue = Fixed contract value; Cost = Σ (employee cost × total hours); Profit = Revenue − Actual Cost, informed by current % completion
- **FR32:** The system calculates AMC project profitability as: Revenue = AMC contract value; Cost = Support hours × cost per hour; Profit = Revenue − Cost
- **FR33:** The system calculates Infrastructure project profitability as: Revenue = Infra invoice; Cost = Infra vendor cost + manpower allocation; Profit = Revenue − Cost
- **FR34:** The system surfaces profitability at four levels: project, practice/discipline, department, and company-wide
- **FR35:** Users can view the calculation breakdown for any profitability figure to understand how it was derived

### Dashboards & Reporting

- **FR36:** Admin and Finance can view the Executive Dashboard (total revenue monthly/YTD, total cost, gross margin %, utilisation %, top 5 and bottom 5 projects by profitability)
- **FR37:** Admin, Finance, Delivery Manager (own projects), and Department Head (department projects) can view the Project Dashboard (revenue vs. cost, margin %, budget vs. actual for Fixed Cost, burn rate, practice-level cost breakdown)
- **FR38:** Admin, Finance, and Department Head (own resources) can view the Employee Dashboard (billable %, revenue contribution, cost, profit, profitability rank)
- **FR39:** Admin, Finance, Delivery Manager (own department), and Department Head (own department) can view the Department Dashboard (revenue, cost, utilisation %, profit %, and month-on-month comparison across available historical periods)
- **FR40:** Admin can view a pending project approvals panel surfaced on their dashboard

### Export, Sharing & Audit

- **FR41:** Finance and Admin can export any dashboard report as a PDF
- **FR42:** Finance and Admin can generate a shareable read-only link to a specific report that does not require authentication to access
- **FR43:** The system records an audit log entry for: data uploads (timesheet, billing, employee master), project creation, project approval/rejection, and % completion edits
- **FR44:** Admin can view the audit log

## Non-Functional Requirements

### Performance

- **NFR1:** All dashboard pages render within 1 second for a user with a stable internet connection
- **NFR2:** Profitability recalculation completes and dashboards reflect updated data within 30 seconds of a successful upload
- **NFR3:** PDF export generation completes within 10 seconds
- **NFR4:** File upload validation and processing (for typical file sizes up to 5,000 rows) completes within 60 seconds

### Security

- **NFR5:** All client-server communication is encrypted via HTTPS
- **NFR6:** Passwords are stored using a bcrypt hash (or equivalent one-way hashing algorithm); plaintext passwords are never stored or logged
- **NFR7:** JWT access tokens expire after 2 hours of inactivity; active sessions are refreshed automatically
- **NFR8:** All API endpoints validate the authenticated user's role before returning data; role scoping is enforced server-side on every request
- **NFR9:** Sensitive fields (individual employee CTC, contract values, billing rates) are not written to application logs
- **NFR10:** CORS policy restricts API access to the application's own domain

### Reliability

- **NFR11:** The system targets 99.5% monthly uptime during business hours (Monday–Saturday, 8am–8pm IST)
- **NFR12:** PostgreSQL database is backed up daily on AWS with a minimum 30-day retention period
- **NFR13:** Audit log entries are immutable — no modification or deletion of audit records is permitted by any user role
- **NFR14:** A failed profitability recalculation does not corrupt previously stored profitability data; the system retains the last successful calculation state

### Scalability

- **NFR15:** The system is designed for an initial user base of up to 50 concurrent users and up to 500 active projects without architectural changes
- **NFR16:** Database schema and query design accommodate upload history growth without requiring structural changes for at least 3 years of operation at current upload cadence
