# BMad User-Driven Development Playbook

**A reusable process guide for any BMAD project. Drop this into your project's `docs/` folder on day one.**

> **Core Principle:** "If a user can't accomplish their task, the feature doesn't exist."

---

## Why This Playbook Exists

BMAD agents build technically correct software at speed. But speed creates a trap: features get built as isolated technical units rather than coherent user experiences. APIs return 200, tests pass, users are confused.

This playbook ensures **user reality drives every BMAD phase** by introducing **User Persona Agents** — first-class BMAD agents that represent your actual end users and participate alongside the development team throughout the lifecycle.

---

## What Are User Persona Agents?

User Persona Agents are BMAD agents — just like Amelia (Dev) or Quinn (QA) — except they represent **end users**, not team members. They:

- Are defined as `.agent.yaml` files following the standard BMAD agent schema
- Are registered in the agent manifest and invocable via skills
- Participate in Party Mode alongside development agents
- Have menus with actions like "Review Story," "Walk Through Feature," "Run UAT"
- Challenge stories, test cases, and designs from the **user's perspective**

They are the permanent "show your mom" test built into your workflow.

---

## Phase 0: Create User Persona Agents (Before Any Code)

### Step 1: Identify User Roles

From your product brief or requirements, list every distinct user role. For each, define:

- **Name** — a real human name (makes them tangible in discussions)
- **Role** — their system role
- **Daily workflow** — what they actually do day-to-day
- **Key tasks** — the 3-5 things they MUST accomplish in the system
- **Frustrations** — what would make them say "this is broken" (written as quotes)
- **UAT questions** — validation questions that prove the system works for them
- **Technical comfort** — how sophisticated they are

### Step 2: Create Agent YAML Files

For each persona, create an `.agent.yaml` file. Use the BMad Builder module (`npx bmad-method install` → select BMB) for guided creation, or create manually following the schema:

```yaml
# Example: persona-finance.agent.yaml
agent:
  metadata:
    id: "_bmad/bmm/agents/persona-finance.md"
    name: Priya
    title: Finance User Persona
    icon: 💰
    module: bmm
    capabilities: "revenue upload, profitability review, report sharing, executive reporting"
    hasSidecar: false

  persona:
    role: Finance User Persona — Revenue & Profitability Analyst
    identity: |
      Priya is a methodical finance professional who works in monthly cycles.
      Around the 5th of each month, she uploads revenue data, verifies it reconciled,
      and prepares profitability reports for leadership. She needs to trust the numbers —
      if she can't verify, she won't use the system. She is replacing manual Excel workflows.
    communication_style: |
      Detail-oriented and trust-focused. Asks "can I verify this?" before accepting any output.
      Speaks in terms of reconciliation, audit trails, and what the CFO will ask.
      Gets frustrated when things look wrong or incomplete without explanation.
    principles: |
      - I need to see what I uploaded — every row, success and failure, with reasons for failures
      - Numbers on dashboards must match what I uploaded — if they don't, I can't trust the system
      - Anything I share with leadership must look professional — no raw data, no JSON, no broken layouts
      - If a download or export button exists, it must work — broken downloads destroy my confidence
      - I think in monthly cycles — I need to compare this month vs last month easily

  prompts:
    - id: welcome
      content: |
        💰 Hi, I'm Priya — your Finance User Persona.

        I represent your finance team users. I review stories, test cases, and features
        from the perspective of someone who uploads revenue data monthly and reports
        profitability to leadership.

        **Use me to:**
        - Review stories before development — will finance users understand this?
        - Validate test cases — do they cover what I'd actually do?
        - Run UAT — can I complete my monthly workflow end-to-end?

    - id: review-story
      content: |
        Review this story from the finance user's perspective:
        1. Does this feature help me accomplish my key tasks?
        2. Would I understand what to do without explanation?
        3. What would confuse me or frustrate me?
        4. What would I try to do NEXT after this feature? Is that path built?
        5. Are error states handled in a way I'd understand?
        Report findings as: PASS (no issues), CONCERNS (minor gaps), or BLOCK (unusable for finance users).

    - id: run-uat
      content: |
        Run UAT from the finance user's perspective:
        1. Can I download the upload template? Does it open correctly?
        2. Can I upload my monthly revenue Excel? Do I see success/failure counts?
        3. Can I view what was uploaded — every row, with failure reasons?
        4. After upload, do dashboards reflect the new data?
        5. Can I drill from Executive Dashboard into specific projects?
        6. Can I share a dashboard link? Does it render properly (not JSON)?
        7. Can I export a report that looks professional?
        Report each as PASS/FAIL with specific notes.

  menu:
    - trigger: RS or fuzzy match on review-story
      action: "#review-story"
      description: "[RS] Review Story: Evaluate a story from finance user perspective"

    - trigger: UAT or fuzzy match on run-uat
      action: "#run-uat"
      description: "[UAT] Run UAT: Validate finance workflow end-to-end"
```

### Step 3: Create Agent for Each Role

Repeat the above pattern for every user role. Common persona types:

| Persona Type | Focus | Key Frustration Pattern |
|---|---|---|
| **Admin** | Setup, configuration, user management | "I configured X but it doesn't show up in Y" |
| **Data Entry** | Upload, verify, correct errors | "I uploaded but can't see what happened" |
| **Manager** | Dashboards, drill-down, team view | "Numbers are blank / I can't get to details" |
| **Executive** | High-level views, reports, sharing | "The shared link looks broken" |
| **Viewer** | Read-only access, filtered data | "I can see things I shouldn't / can't see things I should" |

### Step 4: Register in Agent Manifest

Add each persona agent to `_bmad/_config/agent-manifest.csv`:

```csv
"persona-finance","Priya","Finance User Persona","💰","Finance User Persona","revenue upload, profitability review, report sharing","Methodical finance professional...","Detail-oriented, trust-focused...","Numbers must match...","bmm","_bmad/bmm/agents/persona-finance.md"
```

After adding, recompile: `npx bmad-method install` → **Recompile Agents**

### Step 5: Add to Party Mode Team

Add persona agents to `_bmad/bmm/teams/default-party.csv` so they participate in Party Mode alongside development agents.

---

## Phase 1: Discovery — Personas Drive Requirements

**BMAD workflows:** `/bmad-bmm-create-product-brief` → `/bmad-bmm-market-research`

### User Journey Narratives

For each persona, write their complete workflow as a story in `docs/user-persona-agents.md`:

> "Priya logs in on the 5th of every month. She uploads the revenue Excel from accounting. She checks if the upload succeeded — did all rows parse? Any failures? She fixes failures and re-uploads. Then she navigates to the Executive Dashboard to see if margins updated. She drills into the bottom 5 projects. She exports a report and shares it with the CFO."

These narratives expose requirements that feature lists miss:
- **Navigation paths** — what's the actual click sequence?
- **Data flow dependencies** — upload → calculation → dashboard → drill-down
- **Error recovery needs** — what happens when step 3 fails?
- **Cross-feature connections** — features that seem independent but aren't

### Feature-Role Access Matrix

Before designing anything, map what each role can see and do:

```markdown
| Feature Area | Admin | Finance | Manager | Executive | HR |
|---|---|---|---|---|---|
| [Feature 1] | Full CRUD | Read Only | Own Data | View | - |
| [Feature 2] | Configure | Upload + View | - | View | Upload |
```

This matrix prevents:
- **Over-engineering** — building access controls nobody needs
- **Under-engineering** — forgetting who needs what
- **Role confusion** — ambiguity about who sees what

---

## Phase 2: Planning — Personas Review Everything

**BMAD workflows:** `/bmad-bmm-create-prd` → `/bmad-bmm-create-ux-design` → `/bmad-bmm-create-architecture`

### PRD Validation with Personas

When John (PM) creates the PRD:
- Every requirement must map to at least one persona's key task
- If a requirement doesn't serve any persona → question whether it's needed
- If a persona's key task isn't covered → there's a gap

Run each persona agent's `review-story` prompt against the PRD sections.

### UX Design Follows Journeys, Not Features

When Sally (UX) designs:
- Design screens by following persona journey narratives, not feature checklists
- Every screen must answer: "What does [Persona] do next from here?"
- If two screens serve the same persona for the same task → merge them

**Anti-patterns to catch at design time:**
- Duplicate screens for the same task
- Dead-end screens with no clear next action
- Screens showing technical data instead of user-meaningful information

### Architecture: No More Roles Than the Brief Specifies

When Winston (Architect) designs:
- RBAC comes directly from the Feature-Role Matrix — no more, no less
- Don't invent role hierarchies the business didn't ask for
- If the personas don't need it, don't build it

---

## Phase 3: Story Writing — Personas as Co-Authors

**BMAD workflows:** `/bmad-bmm-create-epics-and-stories` → `/bmad-bmm-create-story`

### Every Story Has a Persona Owner

```markdown
## Story: [Title]

**Primary Persona:** [Name] ([Role])
**Journey:** [Which user journey does this enable?]

### Acceptance Criteria
- [ ] [Persona] can complete the task end-to-end via UI
- [ ] Result is visible where [Persona] would expect to see it
- [ ] Error states show user-friendly feedback
- [ ] Data appears correctly in all related screens/dashboards
- [ ] Role permissions enforced

### Persona Review
Run: /bmad-agent-persona-[role] → [RS] Review Story
```

### Persona Agent Reviews Stories Before Dev

Before any story moves to development, invoke the relevant persona agent and run `RS` (Review Story). The persona agent evaluates:

1. Would this persona understand this feature?
2. Does it fit into their daily workflow?
3. What would they try to do NEXT? Is that path built?
4. What would frustrate them?

Verdict: **PASS**, **CONCERNS** (minor gaps to address), or **BLOCK** (unusable).

### Cross-Feature Impact Section

Every story that creates or modifies data must include:

```markdown
### Cross-Feature Impact
- [ ] New [entity] appears in: [list all dropdowns, lists, dashboards]
- [ ] Modified data reflects in: [list all views that show this data]
- [ ] Permissions enforced in: [list all endpoints and views]
```

---

## Phase 4: Development — Build as the User

**BMAD workflow:** `/bmad-bmm-dev-story`

### Vertical Slices, Not Horizontal Layers

Don't build "all APIs, then all UI." Build one complete user journey at a time. Every delivered increment must be **usable by a persona**, not just technically complete.

### Developer Self-Test Protocol

Before marking ANY story complete, Amelia (Dev) must:

1. **Log in as the target persona's role** — not admin
2. **Navigate using only the UI** — no direct URLs
3. **Complete the task with realistic data**
4. **Verify results appear where the persona expects**
5. **Test one error path**

### Cross-Feature Impact Verification

- [ ] Added a new entity? Check all dropdowns, dashboards, and lists
- [ ] Changed data? Check all views that display this data
- [ ] Added a shareable feature? Actually open the shared link in a new browser
- [ ] Added a download? Actually click download and open the file

---

## Phase 5: Testing — Quinn + Persona Agents in Tandem

**BMAD workflow:** `/bmad-bmm-qa-generate-e2e-tests`

### Test Suites Named by Persona Journey

```
tests/journeys/
  admin-onboard-new-team-member.spec.ts
  finance-monthly-revenue-cycle.spec.ts
  manager-daily-project-check.spec.ts
  hr-employee-utilization-review.spec.ts
  exec-department-monthly-report.spec.ts
```

### Quinn Co-Authors Tests with Persona Agents

Quinn writes functional acceptance tests. Persona agents review them:

```
❌ test('POST /api/billing returns 201')
✅ test('Priya uploads revenue file, sees 47 successes and 3 failures with reasons')

❌ test('GET /api/dashboard returns data')
✅ test('Vikram logs in, sees his 3 projects with revenue and margin, clicks into Project Alpha')
```

For each test suite, invoke the relevant persona agent's `UAT` prompt to validate coverage.

### Persona Agent UAT Protocol

After each sprint, run each affected persona agent's UAT:

```
/bmad-agent-persona-[role] → [UAT] Run UAT
```

The persona agent evaluates:
- Can I complete all my key tasks?
- Does data show up where I expect?
- Are there dead ends?
- Do shared/exported outputs look professional?

Any UAT failure = **P0/P1 bug** blocking the sprint.

### Party Mode UAT Review

Run `/bmad-party-mode` with both development agents AND persona agents. Present the sprint deliverables. Let personas challenge the team in real-time:

> 💰 **Priya**: "I uploaded revenue data but the Executive Dashboard still shows last month's numbers. John, why does the story say 'done' if the dashboard doesn't update?"
> 📋 **John**: "That's a cross-feature gap in the AC. We need to add dashboard refresh verification to every upload story."

This is the conversation that produces great products.

---

## Phase 6: Definition of Done (Complete)

A story is **DONE** when ALL gates pass:

### Technical Gate
- [ ] Code compiles, no lint errors, type-safe
- [ ] Unit tests pass

### Functional Gate
- [ ] Developer self-tested as target persona role in browser
- [ ] Cross-feature impact verified
- [ ] Error paths tested
- [ ] Empty/first-use state makes sense

### Product Gate
- [ ] Persona agent reviewed story: PASS
- [ ] Feature fits naturally into persona's documented workflow
- [ ] No dead ends, broken links, or raw technical output visible

### Quality Gate
- [ ] QA persona journey test written and passing
- [ ] Shared/exported features tested from recipient's perspective
- [ ] Cross-role verification (visible to intended role, hidden from others)

---

## Integration Map: Which Agent Uses Personas When

| BMAD Agent | When | How |
|---|---|---|
| 📊 Mary (Analyst) | Discovery | Validates requirements map to real persona needs |
| 📋 John (PM) | Story writing | Runs persona `RS` review before approving stories |
| 🎨 Sally (UX) | Design | Validates screens against persona journey narratives |
| 🏗️ Winston (Architect) | Architecture | Derives RBAC from Feature-Role Matrix only |
| 💻 Amelia (Dev) | Implementation | Self-tests as target persona before marking done |
| 🧪 Quinn (QA) | Testing | Co-authors persona journey tests; runs persona `UAT` per sprint |
| 🏃 Bob (SM) | Sprint management | Gates stories with persona review in DoD |
| 🚀 Barry (Quick Flow) | Quick specs | Even quick specs get "which persona, which task?" check |

---

## File Structure for Persona Agents

```
_bmad/
  bmm/
    agents/
      persona-admin.md          ← Compiled agent file
      persona-finance.md
      persona-manager.md
      persona-hr.md
      persona-executive.md
  _config/
    agents/
      bmm-persona-admin.customize.yaml
      bmm-persona-finance.customize.yaml
      ...

docs/
  user-persona-agents.md        ← Journey narratives, frustrations, UAT questions
  feature-role-matrix.md        ← Access matrix

.claude/commands/               ← Auto-generated by installer
  bmad-agent-persona-admin.md
  bmad-agent-persona-finance.md
  ...
```

---

## Anti-Pattern Catalog

| Anti-Pattern | Symptom | Prevention |
|---|---|---|
| **Screen-first design** | Duplicate screens for same task | Journey-first design, redundancy check |
| **API-first testing** | Tests pass, users can't complete tasks | Persona journey tests |
| **Role explosion** | More roles than business needs | Feature-Role Matrix from brief only |
| **Feature islands** | Each feature works alone, nothing connects | Cross-feature impact checklist |
| **Happy-path-only** | Works with perfect data, breaks with real data | Persona frustration quotes as test cases |
| **Technical DoD** | "Tests pass" = done, user is stuck | Full DoD with functional + product gates |
| **Build-then-polish** | "We'll fix UX later" — later never comes | Polish is part of done, not a future phase |
| **Silent failures** | Upload "succeeds" but user can't see results | Transparency requirement in every data feature |
| **Persona as docs** | Personas in a slide deck nobody reads | Personas as live BMAD agents that participate |

---

## Quick Reference: The 5 Questions

At every stage, every agent should answer:

1. **Who is this for?** → Name the persona
2. **What are they trying to do?** → Name the task from their key tasks
3. **Can they do it right now?** → Test it as them
4. **What happens when it goes wrong?** → Test the error path as them
5. **Where else does this show up?** → Check cross-feature impact

If you can't answer all five, the work isn't ready.

---

## Getting Started Checklist

- [ ] Define all user roles from product brief
- [ ] Create persona agent YAML for each role (use BMad Builder or manual)
- [ ] Write journey narratives in `docs/user-persona-agents.md`
- [ ] Create Feature-Role Access Matrix in `docs/feature-role-matrix.md`
- [ ] Register persona agents in agent manifest
- [ ] Add persona agents to Party Mode team
- [ ] Run `npx bmad-method install` → Recompile Agents
- [ ] Verify persona agents appear in Party Mode: `/bmad-party-mode`
- [ ] Update team's Definition of Done to include persona gates

> **BMAD agents build software fast. User Persona Agents ensure it's software worth building. Use both, together, always.**
