---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflowStatus: complete
inputDocuments:
  - docs/requirements/raw_requirements.md
date: 2026-02-23
author: Dell
---

# Product Brief: BMAD_101

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

IPIS (Internal Profitability Intelligence System) is an internal web-based
application that gives an IT services company's accounts team a fast, reliable,
and consistent view of project profitability — replacing fragmented,
PM-dependent Excel workflows with a single source of truth.

As the project portfolio grows across multiple engagement models (T&M, Fixed
Cost, AMC, and Infrastructure), manual profitability tracking has become
unsustainable. IPIS centralizes salary data, timesheet inputs, and project
revenue information, recalculating profitability on demand each time new data
is uploaded.

The tool's primary purpose is **visibility and timely intelligence** — not
profit generation. It arms the accounts team with accurate numbers that they
can share with leadership before a project crosses the point of no return.
What leadership does with that intelligence is outside the system's scope.

This project also serves as a proof of concept for fully AI-assisted,
end-to-end application development.

---

## Core Vision

### Problem Statement

When leadership asks "Are we profitable on this project?", the answer today
requires a PM to manually gather timesheets from finance, cross-reference
salary data, locate the Statement of Work, and estimate remaining scope — a
process that takes roughly a day and produces a result few people fully trust.
For fixed-cost projects, the confidence gap is even wider: without a reliable
way to track actual internal spend against a fixed contract value, projects
can silently erode profitability for weeks before anyone raises a flag.

There is no central repository for project engagement details (billing model,
contract value, revenue received vs. pending). There is no standard process.
Each PM manages this differently — or not at all.

### Problem Impact

- **Silent overruns**: Teams work beyond planned hours with no one tracking
  the financial impact until it is too late.
- **Scope creep without recourse**: When a fixed-price project evolves beyond
  its original scope, the company loses the ability to build a credible, timely
  case for change requests — forcing painful, multi-revision Excel battles with
  clients after the fact.
- **Accountability gaps**: With no centralized oversight, profitability tracking
  depends entirely on individual PM diligence. If a PM drops the ball, no one
  else is looking.
- **Strategic blindness**: Leadership cannot see which practices (Python,
  Frontend, QA, etc.) are consistent profitable contributors vs. cost centers.

### Why Existing Solutions Fall Short

Off-the-shelf tools are not tailored to this company's combination of
engagement models, internal cost structure (salary + universal overhead), and
practice-level billing logic. The company already has the raw data — timesheets
and salary records — but lacks a system to bring it together meaningfully.
Manual Excel workflows are non-standard, non-auditable, and do not scale as
the project portfolio grows.

### Proposed Solution

IPIS is a centralized, internal web application that:

- Ingests three data inputs via Excel upload — employee salary master (yearly,
  with sample file provided for formatting guidance), timesheets (fixed format,
  variable cadence), and project revenue/billing records — recalculating
  profitability on every upload
- Supports variable upload cadence: routine projects upload monthly; projects
  under scrutiny can upload daily or weekly for near-real-time visibility
- Calculates project profitability for all engagement types (T&M, Fixed Cost,
  AMC, Infrastructure) using consistent, configurable logic
- Surfaces profitability at four levels: project, practice/discipline,
  department, and company-wide
- Enables the accounts team to export and share reports with leadership,
  closing the intelligence loop
- Supports PM/tech lead input (e.g., % completion for fixed-cost projects)
  entered by the accounts team based on offline communication

The accounts team are the system's primary power users — they upload data,
review reports, and share intelligence with leadership. Post-report course
correction is outside IPIS scope.

### Key Differentiators

1. **Variable cadence intelligence**: Upload frequency flexes with project risk
   level — a project under scrutiny gets daily uploads and daily reports;
   steady projects get monthly reviews. This is what makes early warning
   genuinely credible.
2. **Practice-level cost attribution**: Beyond project P&L, IPIS shows how
   much each discipline contributed to a project's internal cost — and how much
   revenue each practice generates across the portfolio.
3. **Multi-model profitability logic**: Each engagement type has a distinct
   revenue-cost calculation model built in — not a generic template hacked to fit.
4. **Internal cost model fidelity**: Uses the company's actual cost structure
   (Annual CTC + ₹1,80,000 universal overhead ÷ configurable standard monthly
   working hours).
5. **AI-assisted development POC**: IPIS doubles as a proof of concept for
   fully AI-assisted end-to-end application development.

> **Note:** Additional cost inputs (software licenses, hardware depreciation,
> etc.) are out of scope for v1 but flagged for future consideration.

---

## Target Users

### Primary Users

#### Priya — Accounts Executive
**Role:** Accounts / Finance Team (2-person team)
**Context:** Priya handles a broad range of finance responsibilities —
invoicing, payroll, vendor payments, and more. Profitability reporting is
one part of her job, not the whole of it. She works across multiple tools
daily and context-switches frequently.

**Problem Experience Today:**
When leadership asks for a profitability update, Priya manually collects
timesheets from PMs, cross-references salary data, and assembles a report
in Excel — a process that takes close to a day and still leaves her
uncertain, especially on fixed-cost projects where scope completion is
someone else's estimate.

**In IPIS:**
Priya is the system's power user and intelligence hub. She uploads timesheet
data (daily, weekly, or monthly depending on project urgency), uploads
revenue and billing records, reviews the generated profitability reports,
and exports or shares them with leadership. Everything flows through her.

**Success Vision:**
Upload the timesheet → get a clean, trustworthy profitability verdict
(green / amber / red) with drill-down detail available — and share with
leadership in minutes, not a day. Numbers she can stand behind.

---

#### Ravi — HR Manager
**Role:** Human Resources
**Context:** Ravi manages the employee lifecycle. He does not interact with
project delivery or finance reporting — his role in IPIS is purely data
stewardship. But because every profitability calculation depends on accurate
employee salary data, Ravi's data quality directly determines report
trustworthiness.

**In IPIS:**
Ravi performs the annual bulk upload of the employee salary master at the
start of each financial year (using a provided sample file for formatting).
The system imports valid records immediately and generates a downloadable
success/fail report — Ravi can download the failed rows, fix them, and
re-upload separately. Throughout the year, he adds new joiners via a
form-based UI, edits employee details (designation, salary revisions), and
marks employees as resigned.

**Success Vision:**
Employee data is always current and accurate. Adding a new joiner or
correcting a salary takes minutes — not a spreadsheet revision cycle.

---

### Secondary Users

#### Arjun — Delivery Manager / Department Head
**Role:** Project Delivery Lead
**Context:** Arjun owns project delivery. He knows the scope, the team,
the engagement model, and the commercial terms better than anyone. He is
both a data contributor and a report consumer in IPIS.

**In IPIS:**
Arjun creates new projects in the system — entering engagement model
(T&M / Fixed Cost / AMC / Infrastructure), contract value, billing rates,
team composition, project start and end dates, and all other required
financial fields. Newly created projects enter a **pending approval state**
and go live only after Leadership/Admin review and approval — ensuring
commercial details are validated before they feed into any report. For
active fixed-cost projects, Arjun provides periodic % completion estimates
(communicated to the accounts team, who enter them into the system). He
logs in to view project-level and practice-level profitability for the
projects he manages.

**Success Vision:**
Creates a project once, keeps it updated, and can see which practice is
over-spending before leadership asks the question — with time to act.

---

#### Leadership / Executive (Admin)
**Role:** Company Leadership with full Admin access
**Context:** Leadership needs a portfolio-wide view of company
profitability — across all projects, all practices, and all departments.
They are both **active approvers** and **strategic report consumers**.

**In IPIS:**
Leadership logs in with Admin credentials and sees all projects and all
stats across the portfolio. When a Delivery Manager creates a new project,
it enters a pending state — Leadership reviews and approves the commercial
details before the project goes live in the system. Their dashboard
surfaces pending approvals prominently alongside the full portfolio view.
Leadership can also receive shareable report links from the accounts team
for quick async consumption.

**Success Vision:**
Logs in and immediately sees portfolio health — which projects need
attention, which practices are performing — without waiting for a PM to
compile a report. Project approval takes seconds, not a meeting.

---

### User Journey — Accounts Executive (Primary Flow)

**Onboarding:**
IPIS is introduced as the new profitability system. Priya uploads the
employee master (provided by HR), a historical timesheet, and a sample
revenue file. She reviews her first profitability report and validates it
against an existing manual calculation.

**Core Usage — Monthly Cycle:**
At month end, Priya uploads the latest timesheet and any new billing
records. IPIS recalculates profitability across all active projects. She
reviews the output, flags anything that looks off, and exports a summary
to share with leadership.

**Core Usage — High-Urgency Cycle:**
A project is flagged for close monitoring. The team updates timesheets
daily. Priya uploads each new submission. Leadership gets near-real-time
cost visibility without anyone assembling a manual report.

**Aha Moment:**
The first time Priya gets a complete, accurate profitability picture across
all projects in under five minutes — green / amber / red at a glance,
detail available on demand — instead of spending a day in spreadsheets.

**Long-term:**
IPIS becomes a fixed part of the monthly finance close. Leadership stops
asking PMs directly — they ask Priya, and Priya has the answer.

---

### User Journey — HR Manager (Data Steward Flow)

**Annual Cycle:**
At the start of the financial year, Ravi bulk uploads the employee salary
master. He reviews the success/fail report, downloads the failed rows,
fixes formatting issues, and re-uploads until all records are clean.

**Ongoing:**
New joiner? Ravi adds them via the individual entry form on the day they
join — salary goes live immediately in all downstream calculations. Employee
resigned? Ravi marks them accordingly. Salary revised? Updated in minutes.

---

### User Journey — Delivery Manager (Contributor + Consumer Flow)

**Project Creation:**
When a new project is awarded, Arjun creates it in IPIS with all financial
details. The project enters pending approval state. Leadership reviews and
approves within the system. The project goes live and begins appearing in
all profitability reports.

**Ongoing:**
Arjun logs in periodically to check his project's cost burn by practice.
When the accounts team needs a % completion update for a fixed-cost
project, he provides the estimate. He views the practice-level breakdown
to understand where budget is being consumed.

**Aha Moment:**
Sees that backend has consumed 80% of the project budget at 50% of
delivery — raises a change request proactively, with data to back it up.

---

### User Journey — Leadership / Admin (Approver + Viewer Flow)

**Approver Mode:**
Logs in and sees pending project approvals. Reviews commercial details
submitted by Delivery Managers — engagement model, contract value, billing
rates. Approves or sends back for correction. Projects go live only after
this checkpoint.

**Viewer Mode:**
Browses full portfolio profitability — all projects, all practices, all
departments. Spots underperforming projects and over-extended practices
without waiting for a weekly report from the accounts team.

---

## Success Metrics

### User Success

| Metric | Baseline (Today) | Target |
|---|---|---|
| Time to produce a profitability report | ~1 day (manual) | Under 1 hour |
| Report generation method | Manual Excel assembly | IPIS as primary source — Excel no longer needed for profitability reporting |
| Fixed-cost project visibility | Unknown spend vs. scope until too late | Active projects show real-time cost vs. % completion on every upload |
| Resource allocation accuracy | Unassigned resources billing to projects unknowingly | Zero unbilled resource hours on projects they are not formally assigned to |

**Adoption signal:** The accounts team stops producing manual Excel
profitability reports. Leadership routes all profitability questions
through IPIS output — not through PMs.

**Delivery Manager value signal:** Reduction in fixed-cost project overruns
attributable to earlier visibility into cost burn vs. scope completion.

---

### Business Objectives

**3-Month Target — "This was worth building":**
- Fixed-cost projects are not silently overrunning. Cost vs. % completion
  is visible before the project crosses the point of no return.
- No resources are working on projects they are not formally onboarded to —
  eliminating invisible cost leakage.
- The accounts team is using IPIS as their primary profitability tool, not
  as a secondary check against Excel.

**12-Month Direction:**
- Measurable improvement in gross margins on fixed-cost and T&M projects
  as a direct result of earlier cost visibility and faster CR recovery.
- IPIS is embedded in the company's standard operating rhythm —
  profitability review is a regular, data-driven process, not an ad hoc
  exercise triggered by leadership concern.

> **Note:** Specific 12-month quantitative targets to be defined after
> 3-month baseline data is established from live usage.

---

### Key Performance Indicators

**Operational KPIs (tracked from launch):**
- **Report generation time:** Time from timesheet upload to shareable
  profitability report — target ≤ 1 hour
- **Data freshness:** % of active projects with timesheet data uploaded
  within the last 30 days — target 100%
- **Project data completeness:** % of active projects with all required
  fields populated (engagement model, contract value, billing rates) —
  target 100% within 30 days of launch
- **Resource allocation accuracy:** Count of timesheet entries logged
  against projects where the resource is not formally assigned — target 0

**Business KPIs (tracked from 3 months):**
- **Fixed-cost overrun rate:** % of fixed-cost projects exceeding internal
  cost budget — target: measurable reduction vs. pre-IPIS baseline
- **CR recovery rate:** % of change requests raised within the project
  lifecycle (vs. after completion) — target: improvement vs. baseline
- **Gross margin improvement:** Month-on-month margin trend across active
  projects — target: upward direction within 6 months

---

### POC Success Criteria (AI-Assisted Development)

IPIS also validates AI-assisted end-to-end software delivery. Success on
this dimension means:

- **Complete delivery lifecycle covered:** Requirements → Architecture →
  Development → QA → Test case documentation → Testing → CI/CD pipeline —
  all phases executed with AI assistance
- **Production-grade output:** The delivered application is functional,
  tested, and deployable — not a prototype
- **Test coverage:** All core features covered by documented test cases
  with passing automated tests
- **CI/CD pipeline operational:** Automated build, test, and deployment
  pipeline in place from day one
- **Process documentation:** The AI-assisted development workflow is
  documented as a repeatable model for future projects

---

## MVP Scope

### Core Features

#### 1. Data Ingestion & Management

**Employee Master (HR-owned)**
- Bulk Excel upload with downloadable sample file for formatting guidance
- Partial import: valid records imported immediately; failed rows available
  as a downloadable report for correction and re-upload
- Individual form-based entry for new joiners
- Edit employee details (designation, salary, department)
- Mark employee as resigned

**Timesheet Upload (Accounts-owned)**
- Fixed-format Excel upload
- Variable cadence: daily, weekly, or monthly depending on project urgency
- Profitability recalculated automatically on every upload

**Revenue & Billing Data Upload (Accounts-owned)**
- Excel upload of project invoice/billing records
- Fields: Project ID, Client Name, Invoice Amount, Invoice Date,
  Project Type, Vertical

---

#### 2. Project Management

**Project Creation (Delivery Manager-owned)**
- Delivery Manager creates projects with full financial details:
  engagement model, contract value, billing rates, team composition,
  project start and end dates, client, vertical
- All 4 engagement models supported: T&M, Fixed Cost, AMC, Infrastructure

**Project Approval Workflow**
- Newly created projects enter a pending approval state
- Admin/Leadership reviews and approves commercial details
- Project goes live and appears in all reports only after approval
- Admin can send project back for correction

**% Completion Entry (Accounts-owned, Fixed Cost projects)**
- Accounts team enters periodic % completion estimates for fixed-cost
  projects based on offline communication with PM/Tech Lead

---

#### 3. Profitability Calculation Engine

**Employee Cost Formula:**
> (Annual CTC + ₹1,80,000 universal overhead) ÷ 12 ÷ configurable
> standard monthly working hours (default: 160 hrs)

**Engagement Model Logic:**

| Model | Revenue | Cost | Profit |
|---|---|---|---|
| T&M | Billed hours × billing rate | Employee cost × project hours | Revenue − Cost |
| Fixed Cost | Fixed contract value | Σ (employee cost × total hours) | Revenue − Actual Cost |
| Infrastructure | Infra invoice | Infra vendor cost + manpower allocation | Revenue − Cost |
| AMC | AMC contract value | Support hours × cost per hour | Revenue − Cost |

Profitability recalculates on every data upload — no scheduled jobs,
no real-time streaming. Trigger is always a human upload action.

---

#### 4. Dashboards

**Executive Dashboard (Admin / Accounts view)**
- Total Revenue (monthly / YTD)
- Total Cost
- Gross Margin %
- Utilisation %
- Top 5 profitable projects
- Bottom 5 projects

**Project Dashboard (Delivery Manager / Accounts / Admin)**
- Revenue vs. Cost
- Margin %
- Budget vs. Actual (Fixed Cost projects)
- Burn Rate
- Practice-level cost breakdown (how much each discipline consumed)

**Employee Dashboard (Accounts / Admin)**
- Billable %
- Revenue Contribution
- Cost
- Profit
- Profitability Rank

**Department Dashboard (Department Head / Admin)**
- Revenue
- Cost
- Utilisation %
- Profit %
- Month-on-month comparison

---

#### 5. Role-Based Access Control

| Role | Access |
|---|---|
| Admin / Leadership | Full access — all projects, all dashboards, project approval, user management |
| Finance / Accounts | Upload all data types, view all reports, export and share reports |
| HR | Employee master management only (add, edit, bulk upload, mark resigned) |
| Delivery Manager | Create and manage own projects, view project and department reports |
| Department Head | View department-level dashboard and reports |

---

#### 6. Export & Sharing
- Export reports (PDF)
- Shareable report links for async distribution to leadership

---

### Out of Scope for MVP

| Feature | Rationale |
|---|---|
| Proactive alerts / threshold notifications | Adds complexity; on-demand visibility is sufficient for v1 |
| Historical trend comparison (month-on-month charts) | Requires baseline data; deferred to v2 |
| Project watch-list / monitoring flags | Manual cadence control is sufficient for v1 |
| Audit trail for % completion estimates | Useful but not critical for v1 |
| Additional cost inputs (licenses, hardware depreciation) | Out of scope; flagged for future consideration |
| Integration with existing timesheet system | Removes manual upload step; deferred to v2 |
| Budget forecasting / planning features | Beyond v1 intelligence scope |

---

### MVP Success Criteria

The MVP is considered successful when:

- All 4 engagement model calculations produce correct results validated
  against manual Excel calculations
- Accounts team can go from timesheet upload to shareable profitability
  report in ≤ 1 hour
- All 5 user roles can log in and access their appropriate views with
  correct data scoping
- No timesheet entries exist against projects where the resource is not
  formally assigned
- Fixed-cost project cost vs. % completion is visible and current on
  every upload cycle
- CI/CD pipeline is operational and all core features have passing
  automated test coverage

---

### Future Vision

Post-v1 direction to be finalised after stakeholder demo. Likely
candidates based on discovery:

- **Proactive alerting:** Notify accounts team or leadership when a
  project's cost burn crosses a configurable threshold
- **Trend analysis:** Month-on-month profitability direction per project
  and practice
- **Timesheet system integration:** Eliminate manual upload by connecting
  directly to the existing timesheet source
- **Budget forecasting:** Project future cost burn based on current run rate
  and remaining scope
- **Expanded cost model:** Include software licenses, hardware depreciation,
  and other overhead categories
