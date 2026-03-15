#!/bin/bash
# Automated Sprint Execution — Runs dev-story + code-review for each story
# Usage: ./scripts/run-sprint.sh [epic-number]
# Example: ./scripts/run-sprint.sh 9

set -e

EPIC=${1:?Usage: ./scripts/run-sprint.sh <epic-number>}
ARTIFACTS="_bmad-output/implementation-artifacts"
LOG_DIR="scripts/sprint-logs"
mkdir -p "$LOG_DIR"

# Find all story files for this epic
STORIES=$(ls "$ARTIFACTS" | grep "^${EPIC}-[0-9]" | grep -v "retrospective" | sort -t'-' -k2,2n)

if [ -z "$STORIES" ]; then
  echo "No stories found for Epic $EPIC"
  exit 1
fi

echo "========================================"
echo "  SPRINT EXECUTION — Epic $EPIC"
echo "========================================"
echo ""
echo "Stories to implement:"
echo "$STORIES" | while read s; do echo "  → $s"; done
echo ""
echo "Each story runs: /bmad-dev-story → /bmad-code-review"
echo "========================================"
echo ""

STORY_COUNT=$(echo "$STORIES" | wc -l | tr -d ' ')
CURRENT=0

SKIPPED=0

for STORY_FILE in $STORIES; do
  CURRENT=$((CURRENT + 1))
  STORY_NAME="${STORY_FILE%.md}"

  # Skip stories already implemented (status: review or done)
  STATUS=$(grep -m1 '^Status:' "$ARTIFACTS/$STORY_FILE" 2>/dev/null | awk '{print $2}' | tr -d '[:space:]')
  if [[ "$STATUS" == "review" || "$STATUS" == "done" ]]; then
    echo "  ⏭️  Skipping $STORY_NAME (status: $STATUS)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  LOG_FILE="$LOG_DIR/${STORY_NAME}-${TIMESTAMP}.log"

  echo ""
  echo "════════════════════════════════════════"
  echo "  [$CURRENT/$STORY_COUNT] $STORY_NAME"
  echo "════════════════════════════════════════"
  echo ""

  # Phase 1: Dev Story — Implement
  echo "🔨 Phase 1: Implementing story..."
  claude -p \
    --dangerously-skip-permissions \
    "You are Amelia, the IPIS senior developer. Implement the story in $ARTIFACTS/$STORY_FILE.

Read the story file first, then execute ALL tasks/subtasks IN ORDER.
- Write production code (backend services, routes, frontend components, pages)
- Write unit tests (Vitest)
- Ensure all existing tests still pass
- Update the story file: change Status to 'in-progress' at start
- Mark each task checkbox as [x] when complete
- When ALL tasks are done, change Status to 'review'
- Update sprint-status.yaml to reflect the story status

Tech stack: React 19 + Vite + Ant Design, Express 5 + Prisma + PostgreSQL, Vitest, Playwright
Key paths: packages/backend/src/, packages/frontend/src/, packages/e2e/

DO NOT skip tasks. DO NOT reorder. Execute exactly as written." \
    2>&1 | tee "$LOG_FILE"

  echo ""
  echo "✅ Dev complete for $STORY_NAME"
  echo ""

  # Phase 2: Code Review
  echo "🔍 Phase 2: Code review..."
  claude -p \
    --dangerously-skip-permissions \
    "You are a senior code reviewer performing adversarial review on the latest changes for story $STORY_NAME.

1. Read the story file: $ARTIFACTS/$STORY_FILE
2. Run: git diff HEAD~1 --stat to see what changed
3. Read each changed file
4. Check:
   - Does the implementation match ALL acceptance criteria?
   - Are there security issues (SQL injection, XSS, missing auth)?
   - Are edge cases handled?
   - Do tests cover the AC?
   - Is currency handled correctly (paise in backend, formatted in frontend)?
5. If issues found: list them clearly and fix them
6. Run: pnpm test to verify all tests pass
7. If all good, update story status to 'review' in sprint-status.yaml" \
    2>&1 | tee -a "$LOG_FILE"

  echo ""
  echo "✅ Code review complete for $STORY_NAME"
  echo "📝 Log: $LOG_FILE"
  echo ""
done

echo ""
echo "========================================"
echo "  SPRINT COMPLETE — Epic $EPIC"
echo "  $((STORY_COUNT - SKIPPED)) stories implemented, $SKIPPED skipped (already done)"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Run full E2E tests: pnpm test:e2e"
echo "  2. Run persona walkthroughs: pnpm exec tsx packages/e2e/persona-walkthroughs/walkthrough.ts"
echo "  3. Run retrospective: /bmad-retrospective"
