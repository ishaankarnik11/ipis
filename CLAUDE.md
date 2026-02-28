# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This project uses the **BMad Method v6** — an AI-driven agile development platform that guides projects from ideation through implementation using specialized agents, structured workflows, and reusable tasks. Everything lives under `_bmad/`.

## Getting Started

```
/bmad-help          # Context-aware help — ask what to do next
/bmad-party-mode    # Start a multi-agent discussion
```

## Agents

Invoke agents via `/bmad-agent-<name>`. Each agent presents a numbered menu on load.

| Command | Agent | Role |
|---|---|---|
| `/bmad-agent-bmad-master` | BMAD Master | Workflow orchestrator, knowledge custodian |
| `/bmad-agent-bmm-analyst` | Mary | Business analyst — research, briefs |
| `/bmad-agent-bmm-pm` | John | Product manager — PRD, epics, stories |
| `/bmad-agent-bmm-architect` | Winston | System architect — architecture, tech design |
| `/bmad-agent-bmm-dev` | Amelia | Senior developer — story implementation |
| `/bmad-agent-bmm-sm` | Bob | Scrum master — sprint planning, backlog |
| `/bmad-agent-bmm-qa` | Quinn | QA engineer — test automation |
| `/bmad-agent-bmm-ux-designer` | Sally | UX designer — interaction design, specs |
| `/bmad-agent-bmm-tech-writer` | Paige | Technical writer — docs, diagrams |
| `/bmad-agent-bmm-quick-flow-solo-dev` | Barry | Solo dev — fast spec + implementation |

## Workflows

Run directly via `/bmad-bmm-<workflow-name>` or through an agent's menu.

**Phase 1 — Analysis**
- `/bmad-brainstorming` — Facilitated brainstorming session
- `/bmad-bmm-create-product-brief` — Product discovery (6+ steps)
- `/bmad-bmm-market-research`, `/bmad-bmm-domain-research`, `/bmad-bmm-technical-research`

**Phase 2 — Planning**
- `/bmad-bmm-create-prd` — Create PRD (12+ steps)
- `/bmad-bmm-validate-prd` — 13-point PRD quality check
- `/bmad-bmm-create-ux-design` — UX specs (13+ steps)

**Phase 3 — Solutioning**
- `/bmad-bmm-create-architecture` — Technical solution design
- `/bmad-bmm-create-epics-and-stories` — Break PRD into epics/stories
- `/bmad-bmm-check-implementation-readiness` — Validate alignment across PRD, UX, architecture

**Phase 4 — Implementation**
- `/bmad-bmm-sprint-planning` — Generate sprint tracking from epics
- `/bmad-bmm-create-story` — Prepare a story with full dev context
- `/bmad-bmm-dev-story` — Execute a story (TDD-driven)
- `/bmad-bmm-code-review` — Adversarial code review
- `/bmad-bmm-retrospective` — Post-epic review

**Quick Flow (small changes, no ceremony)**
- `/bmad-bmm-quick-spec` → `/bmad-bmm-quick-dev`

## Tasks (standalone, anytime)

- `/bmad-help` — What should I do next?
- `/bmad-editorial-review-prose` — Copy-editing
- `/bmad-editorial-review-structure` — Structural analysis
- `/bmad-review-adversarial-general` — Critical/cynical review
- `/bmad-shard-doc` — Split large markdown into smaller files
- `/bmad-index-docs` — Generate/update folder index.md

## Output & Artifacts

- `_bmad-output/planning-artifacts/` — PRDs, briefs, research
- `_bmad-output/implementation-artifacts/` — Architecture, stories, sprint plans
- `docs/` — Project knowledge base (scanned by workflows for context)

## Key Architecture

- **`_bmad/core/`** — Workflow engine (`tasks/workflow.xml`), base protocols
- **`_bmad/bmm/`** — BMad Method Module: agents, workflows, tasks, config
- **`_bmad/_config/`** — Manifests (agent, workflow, task), agent customization files
- **`.claude/commands/`** — 41 slash command definitions (one per agent/workflow/task)
- **`_bmad/bmm/config.yaml`** — Project config: name, user, language, output paths

Workflows are step-based (each step is a separate `.md` file); frontmatter tracks `stepsCompleted`. Agents accept numbered menu selections or fuzzy-matched command shortcuts. Input discovery scans `docs/` for existing context documents automatically.

## Implementation Gate — Sprint Status (MANDATORY)

After completing ANY story implementation — whether via `/bmad-bmm-dev-story`, a direct implementation plan, ad-hoc coding, or any other method — you MUST update `_bmad-output/implementation-artifacts/sprint-status.yaml` to reflect the current story status (`in-progress` while working, `review` when implementation is complete and ready for code review). This applies regardless of which workflow or agent was used. Skipping this step is a process violation.
