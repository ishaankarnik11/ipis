# Ideal Project Development Approach

**Origin:** Retrospective insight from IPIS demo feedback (2026-03-14). Users surfaced basic functional gaps that should have been caught during development. This document captures the approach we would follow if starting fresh — and the approach all future projects should follow.

---

## The Core Problem We Solved For

We built features that were **technically correct but functionally incomplete**. APIs returned 200, tests passed, but users couldn't accomplish their actual tasks. The gap was between "the code works" and "the product works."

---

## Phase 1: User-First Discovery (Before Any Code)

### 1.1 Define User Roles as Living Personas

Don't just list roles — **build persona agents** for each role. Each persona has:

- **Name & title** — makes them real in discussions
- **Daily workflow** — what do they do every day?
- **Key tasks** — the 3-5 things they MUST accomplish in the system
- **Success criteria** — how do they know the system is working for them?
- **Pain points** — what are they trying to escape from (spreadsheets, manual work)?
- **Technical comfort** — how sophisticated are they?

For IPIS, this would have been:
- **Rajesh (Admin)** — manages users, configures system, oversees everything
- **Priya (Finance)** — uploads revenue data monthly, checks project profitability, generates reports for leadership
- **Neha (HR)** — uploads salary data yearly, monitors utilization, identifies hiring needs
- **Vikram (Delivery Manager)** — checks his projects daily, tracks burn rate, manages team allocation
- **Arjun (Department Head)** — monthly department P&L, compares months, identifies underperformers

### 1.2 Map User Journeys Before Screens

For each persona, write out their complete workflow as a narrative:

> "Priya logs in on the 5th of every month. She uploads the revenue Excel she got from accounting. She checks if the upload succeeded — did all rows parse? Any failures? She fixes the failed rows and re-uploads. Then she navigates to the Executive Dashboard to see if margins updated. She clicks into the bottom 5 projects to understand why they're underperforming. She exports a report and shares it with the CFO."

This narrative exposes:
- **Navigation requirements** — what's the click path?
- **Data visibility requirements** — what needs to show where?
- **Error recovery requirements** — what happens when uploads fail?
- **Cross-feature dependencies** — upload → dashboard → drill-down → export

### 1.3 Create a Feature-Role Matrix

| Feature | Admin | Finance | DM | Dept Head | HR |
|---|---|---|---|---|---|
| User Management | Full CRUD | - | - | - | - |
| Upload: Revenue | - | Upload + View | - | - | - |
| Upload: Timesheet | - | - | Upload + View | - | - |
| Upload: Salary | - | - | - | - | Upload + View |
| Project Dashboard | View All | View All | Own Projects | Dept Projects | View All |
| Employee Dashboard | View All | Cost View | Team View | Dept View | Full View |
| Executive Dashboard | Full | Full | - | - | - |
| Department Dashboard | All Depts | Cost View | - | Own Dept | Utilization |
| Share Reports | Yes | Yes | Own | Own | Own |

This matrix prevents both over-engineering (building access controls nobody needs) and under-engineering (forgetting who needs what).

---

## Phase 2: Design for Journeys, Not Screens

### 2.1 UX Design Follows User Journeys

Don't design "an employee screen." Design "what Vikram sees when he wants to check how his team is allocated across projects." The journey dictates the screen, not the other way around.

### 2.2 Eliminate Redundancy at Design Time

If two screens serve the same persona for the same task, merge them. Ask: "Would any user ever need BOTH of these?" If no, consolidate.

### 2.3 Every Screen Gets a "First Visit" Test

For every screen, answer: "A new user lands here for the first time with real data. Can they understand what they're looking at and what to do next?" If not, the design isn't done.

---

## Phase 3: Story Writing with User Agents

### 3.1 Stories Written from User Perspective

Every story must include:
- **Which persona** is this for?
- **What journey** does it enable or improve?
- **What does "done" look like from the user's chair?** (not from the API's perspective)

### 3.2 User Agents Review Stories

Before a story is approved for development, run it past the relevant user persona agents:
- Would this persona understand this feature?
- Does it fit into their daily workflow?
- What questions would they have?
- What would frustrate them?

### 3.3 Acceptance Criteria Include Functional Verification

Every story's AC must include:
- [ ] **User walkthrough** — a human (or user agent) can complete the task end-to-end in the browser
- [ ] **Cross-feature check** — data created/modified here appears correctly everywhere it should
- [ ] **Role-based verification** — tested from the perspective of the target role
- [ ] **Empty/first-use state** — the screen makes sense even with no data
- [ ] **Error state** — something goes wrong and the user knows what happened and what to do

---

## Phase 4: Development with Continuous Validation

### 4.1 Build in Vertical Slices

Don't build "all APIs, then all UI." Build one complete user journey at a time:
Upload revenue → see it in the grid → verify success/failure → see dashboard update.

This ensures every delivered increment is **usable**, not just **functional**.

### 4.2 Developer Self-Test as User

Before marking a story complete, the developer must:
1. Log in as the target role
2. Navigate to the feature using only the UI (no direct URL)
3. Complete the task with realistic data
4. Verify the result appears where the user would expect it

### 4.3 Cross-Feature Impact Check

After completing a feature, check:
- Did I add a new entity? Does it appear in all relevant dropdowns, dashboards, and lists?
- Did I change data? Do all views that display this data reflect the change?
- Did I add a new role/permission? Is it enforced everywhere, not just my new endpoint?

---

## Phase 5: Testing with User Agents

### 5.1 Functional Acceptance Tests (not just API tests)

QA writes tests that simulate real user behavior:
- Log in as Priya (Finance)
- Upload a revenue file
- Verify upload results are visible with success/failure counts
- Navigate to Executive Dashboard
- Verify revenue figures updated
- Share the dashboard via link
- Open the shared link in incognito — verify it renders properly

### 5.2 User Agent UAT

Before any sprint is marked complete, each user persona agent reviews:
- Can I do all my key tasks?
- Does the data I need show up where I expect?
- Are there dead ends where I'm stuck with no next action?
- Does the system feel coherent across features, or like disconnected pieces?

### 5.3 Regression via User Journeys

Regression tests are organized by user journey, not by feature:
- "Finance monthly workflow" test suite
- "DM daily check" test suite
- "Admin onboarding new employee" test suite

---

## Phase 6: Definition of Done (Updated)

A story is DONE when:

- [ ] Code written and tests pass (technical)
- [ ] Type-safe, no lint errors (technical)
- [ ] Developer self-tested as target user role in browser (functional)
- [ ] Cross-feature impact verified (functional)
- [ ] User persona agent reviewed and approved (product)
- [ ] QA functional acceptance test written and passing (quality)
- [ ] No dead ends, broken links, or raw JSON visible to user (polish)

---

## Key Principle

> **"If a user can't accomplish their task, the feature doesn't exist."**

It doesn't matter if the API returns the right data. It doesn't matter if the test suite is green. If Priya can't upload her Excel, see what failed, fix it, and verify the dashboard updated — we haven't built the feature. We've built plumbing.
