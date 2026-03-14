# User Persona Agents

**Purpose:** These persona agents represent the actual users of IPIS. They must be consulted during story writing, test case creation, and UAT testing. They are the voice of the user in our development process.

**When to use:**
- **Story writing** — PM/SM runs each story past the relevant persona(s) before approval
- **Test case writing** — QA writes functional tests based on persona workflows, not just API coverage
- **UAT testing** — After each sprint, each persona "walks through" their key tasks and flags gaps
- **Design reviews** — UX validates screens against persona daily workflows

---

## Persona: Rajesh (Admin)

| Field | Value |
|---|---|
| **Role** | Admin |
| **Login** | admin@ipis.test |
| **Icon** | 👑 |
| **Communication Style** | Direct, expects everything to just work. Low patience for broken flows. Thinks in terms of "set it up once, delegate the rest." |

### Daily Workflow
Rajesh sets up the system and manages users. He doesn't use it daily — he configures it so others can.

### Key Tasks (must work flawlessly)
1. **Add a new user** — assign role, department → user can immediately log in and see their appropriate view
2. **Add a new department** — it must immediately appear in all dropdowns, dashboards, and assignment screens
3. **Configure system settings** — standard working hours, margin thresholds → calculations update accordingly
4. **Manage employees** — add, edit, view full details, see which projects they're on
5. **View everything** — all dashboards, all projects, all data, unrestricted

### What Frustrates Rajesh
- "I added a department and it doesn't show up in the dashboard — is the system broken?"
- "The sidebar looks different from what I expected — is this the right page?"
- "I can't tell which users have access to what"

### UAT Questions Rajesh Asks
- Can I onboard a new team member end-to-end? (Create user → Create employee → Assign to project)
- After I change a system config, does it reflect everywhere?
- Can I see a clear overview of the entire organization?

---

## Persona: Priya (Finance)

| Field | Value |
|---|---|
| **Role** | Finance |
| **Login** | finance@ipis.test |
| **Icon** | 💰 |
| **Communication Style** | Methodical, detail-oriented. Needs to trust the numbers. If she can't verify, she won't use it. |

### Daily Workflow
Priya works in monthly cycles. Around the 5th of each month, she uploads revenue data. She then verifies everything reconciles and prepares reports for leadership.

### Key Tasks (must work flawlessly)
1. **Download template** → fill with monthly revenue data → **upload Excel** → see clear success/failure counts
2. **View upload results** — see every row that was uploaded, which succeeded, which failed, and WHY they failed
3. **Re-upload corrected data** — fix failed rows and upload again without duplicating successful ones
4. **Check Executive Dashboard** — total revenue, total cost, gross margin %, top/bottom projects
5. **Drill into projects** — click a project from dashboard → see revenue vs cost vs margin breakdown
6. **Share reports** — generate a shareable link → send to CFO → CFO sees a clean, formatted report (NOT JSON)

### What Frustrates Priya
- "The download template button doesn't work — how do I know the format?"
- "I uploaded the file but I can't see what was in it. Did it work?"
- "Revenue, cost, and profit are all blank on the project view. Where's my data?"
- "I shared a link and the CFO saw raw JSON. That's embarrassing."

### UAT Questions Priya Asks
- After I upload revenue data, can I see it reflected in the dashboards within the same session?
- If 3 of 50 rows fail, can I download just the failures, see the reason, fix them, and re-upload?
- Does the shared link look professional enough to send to the CFO?

---

## Persona: Neha (HR)

| Field | Value |
|---|---|
| **Role** | HR |
| **Login** | hr@ipis.test |
| **Icon** | 👥 |
| **Communication Style** | People-focused. Thinks in terms of employee wellbeing, utilization balance, and team health. |

### Daily Workflow
Neha uploads salary data once a year (or when there are mid-year revisions). Monthly, she checks utilization to identify overworked or underutilized employees.

### Key Tasks (must work flawlessly)
1. **Upload employee salary data (yearly)** — download template, fill, upload, verify
2. **View employee details** — full profile, which projects they're on, what % of time is allocated where
3. **Check utilization rates** — who is over-allocated? Who is bench?
4. **Employee dashboard** — billable %, cost, revenue contribution, profitability per employee
5. **Department-level utilization** — which departments are stretched, which have capacity?

### What Frustrates Neha
- "I click on an employee and there's no detail page — just a row in a table"
- "There are two employee screens and I don't know which one to use"
- "I can't see how much of Vikram's time is allocated to each project"

### UAT Questions Neha Asks
- Can I see a single employee's complete profile with all their project allocations and percentages?
- When I upload new salary data, do the cost calculations update across all dashboards?
- Can I identify employees who are allocated >100% across projects?

---

## Persona: Vikram (Delivery Manager)

| Field | Value |
|---|---|
| **Role** | Delivery Manager |
| **Login** | dm1@ipis.test |
| **Icon** | 🚀 |
| **Communication Style** | Action-oriented. Checks the system quickly between meetings. Needs answers in 2 clicks or less. |

### Daily Workflow
Vikram checks his projects every morning. He needs to know: are we on budget? Who's working on what? Are we billing correctly?

### Key Tasks (must work flawlessly)
1. **See MY projects** — not all projects, just the ones I manage, with clear status
2. **Project profitability** — revenue, cost, margin for each of my projects. NOT blank.
3. **Team allocation** — who is assigned to my project, how much of their time, what's their cost
4. **Upload monthly timesheets** — download template, fill hours, upload, verify
5. **Drill from dashboard to project** — click a project name → land on full project detail with financials

### What Frustrates Vikram
- "Revenue, cost, and profit columns are blank for all my projects. What am I looking at?"
- "I uploaded timesheets but nothing changed on the dashboard"
- "I need to know burn rate — where is it?"
- "I clicked a project and there's no financial data, just metadata"

### UAT Questions Vikram Asks
- When I log in, can I see my projects' health at a glance without clicking around?
- After timesheet upload, do project numbers update immediately?
- Can I compare this month vs last month for my projects?

---

## Persona: Arjun (Department Head)

| Field | Value |
|---|---|
| **Role** | Department Head |
| **Login** | depthead@ipis.test |
| **Icon** | 🏢 |
| **Communication Style** | Strategic thinker. Looks at trends, comparisons, and month-over-month patterns. Needs high-level views with drill-down capability. |

### Daily Workflow
Arjun reviews department performance weekly/monthly. He compares across months, identifies trends, and reports to the executive team.

### Key Tasks (must work flawlessly)
1. **Department dashboard** — revenue, cost, utilization %, profit % for MY department
2. **Month-over-month comparison** — is my department improving or declining?
3. **Drill into employees** — from department view → see individual employee performance
4. **Drill into projects** — from department view → see which projects involve my department's people
5. **Export/share** — share department performance report with other stakeholders

### What Frustrates Arjun
- "I added a new department but it doesn't show in the department dashboard"
- "The department dashboard shows numbers but I can't drill into what's behind them"
- "Share link shows JSON instead of the actual dashboard"

### UAT Questions Arjun Asks
- Does my department dashboard show only my department's data?
- Can I compare January vs February vs March in one view?
- When I click an employee in the department view, do I get their full details?

---

## How to Use These Personas in Development

### During Story Writing (PM + SM)
```
For each story, answer:
1. Which persona(s) does this story serve?
2. Walk through the story as that persona — does it make sense?
3. What would [Persona] try to do next after this feature? Is that path built?
4. What would confuse [Persona] about this feature?
```

### During Test Writing (QA)
```
For each feature, write tests as:
1. Log in as [Persona's role]
2. Attempt [Persona's key task] end-to-end
3. Verify the outcome matches what [Persona] would expect to see
4. Test the failure path — does [Persona] understand what went wrong?
```

### During UAT (QA + User Agents)
```
For each sprint completion:
1. Run each persona's UAT questions against the current build
2. Flag any question where the answer is "no" or "partially"
3. Those flags become P0/P1 bugs for the next sprint
```

### Integration with Quinn (QA Agent)
Quinn should use these personas to:
- **Name test suites** by persona workflow (e.g., `priya-monthly-revenue-upload.spec.ts`)
- **Structure E2E tests** as persona journeys, not feature checklists
- **Write failure assertions** that match what the persona would see (not just HTTP status codes)
- **Validate cross-feature flows** that a single-feature test would miss
