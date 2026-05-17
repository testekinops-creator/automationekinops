---
trigger: always_on
---

# Graphify — Token-Efficient Always-On Rules for Antigravity
# Models: Gemini 3.1 Pro (High) + Claude Opus 4.6 (Thinking)
# Project: Playwright TypeScript Automation Framework

=====================================
## SECTION 1: ONE-TIME INSTALL
=====================================
CHECK FIRST:
  graphify --version
  → if found: skip to SECTION 2
  → if not found: run install below

INSTALL:
  uv tool install graphifyy && graphify install
  fallback: pipx install graphifyy && graphify install
  fallback: pip install graphifyy && graphify install

CONFIGURE FOR THIS PROJECT (run from project root):
  graphify antigravity install
  graphify hook install
  echo "graphify-out/" >> .gitignore

DONE. Never repeat Section 1.

=====================================
## SECTION 2: BUILD THE GRAPH
=====================================
IF graphify-out/GRAPH_REPORT.md does NOT exist:
  → Tell user: "Graph not found. Building now..."
  → Run: /graphify .
  → Confirm when done: "Graph ready. 3 files created in graphify-out/"
  → Never build automatically again this session

IF graphify-out/GRAPH_REPORT.md EXISTS:
  → Do NOT rebuild
  → Read it and proceed

AFTER task is complete AND files were added/renamed/deleted:
  → Remind ONCE: "Run /graphify . --update to sync the graph"
  → Do NOT run it automatically

AFTER large refactor (5+ files changed):
  → Remind ONCE: "Run /graphify . for a full rebuild"
  → Do NOT run it automatically

=====================================
## SECTION 3: TOKEN BUDGET — HARD LIMITS
=====================================
Per response limits:
  Files read:        MAX 2
  Files written:     MAX 2
  Commands run:      MAX 1 (only if user said run or execute)
  Graph queries:     MAX 1 per response, always use --budget 1500
  Re-read same file: NEVER

If task needs more than 2 files:
  → STOP
  → Tell user: "This touches X files: [list]. Confirm to proceed?"
  → Wait for confirmation

=====================================
## SECTION 4: GRAPH-FIRST WORKFLOW
=====================================
STEP 1 — Read GRAPH_REPORT.md once per session
  Already read this session? Skip. Do NOT re-read.
  Not read yet? Read it now.

STEP 2 — Query graph if GRAPH_REPORT.md not enough
  /graphify query "specific question" --budget 1500
  For dependency tracing: /graphify query "..." --dfs --budget 1500
  For a specific node: /graphify explain "NodeName"
  For connection between two things: /graphify path "A" "B"
  --budget 1500 is MANDATORY on every query. Never skip it.

STEP 3 — Read raw files only if graph is still insufficient
  MAX 1-2 files only
  Never open files to confirm something graph already answered

STEP 4 — Do the task
  Write the code or make the change
  STOP when done
  Do NOT run automatically
  Do NOT open related files to verify
  Do NOT loop

STEP 5 — Report concisely
  State what was changed
  State which graph nodes are affected
  List files that may need updating (from graph only)
  End response. Wait for user.

=====================================
## SECTION 5: PLAYWRIGHT-SPECIFIC RULES
=====================================
WHEN USER SAYS add a test or add a feature:
  1. Read GRAPH_REPORT.md (skip if already read this session)
  2. Run: /graphify query "relevant page object for [feature]" --budget 1500
  3. Read ONLY that one page object file
  4. Write the test using existing fixtures and imports
  5. STOP — do not run, do not open other tests
  6. Reply: "Done. To run: npx playwright test [filename] --headed"

WHEN USER SAYS change or fix or update:
  1. Read GRAPH_REPORT.md (skip if already read this session)
  2. Run: /graphify explain "TargetNode" --budget 1500
  3. If god node: warn user with dependent list BEFORE changing anything
  4. Read ONLY the target file
  5. Make the change
  6. STOP — do not run, do not cascade-read related files
  7. Reply: "Changed [X]. Graph shows these may be affected: [list]"

WHEN USER SAYS run or execute:
  1. Run the command ONCE
  2. Report result
  3. STOP — do not auto-retry, do not auto-fix
  4. If failed: show error, ask "Should I fix this?"
  5. Wait for user

WHEN USER SAYS refactor:
  1. Read GRAPH_REPORT.md (skip if already read this session)
  2. Run: /graphify query "community of [target]" --budget 1500
  3. Warn if god node
  4. Read ONLY the target file
  5. Refactor
  6. STOP — remind user: "Run /graphify . --update when ready"

WHEN USER ASKS why is X failing or which files use X:
  1. Run: /graphify query "X" --dfs --budget 1500
  2. Answer from graph only
  3. Do NOT run test, do NOT grep, do NOT open files
  4. STOP

WHEN USER SAYS add a new page object:
  1. Run: /graphify query "existing page objects" --budget 1500
  2. If similar exists: tell user which one to extend
  3. If not: create it following nearest community node pattern

=====================================
## SECTION 6: STRICT NEVER LIST
=====================================
NEVER run code after writing unless user says run
NEVER check test status automatically
NEVER re-read a file already seen this session
NEVER grep codebase if graph can answer
NEVER query graph without --budget 1500
NEVER read more than 2 files per response
NEVER rebuild graph mid-session automatically
NEVER install dependencies without asking
NEVER retry a failed command automatically
NEVER open related files just to check
NEVER create a page object without checking graph for duplicates
NEVER modify a god node without listing dependents first
NEVER re-read GRAPH_REPORT.md if already read this session

=====================================
## SECTION 7: SESSION MEMORY
=====================================
Mark as READ when seen, do not read again this session:
  [ ] graphify-out/GRAPH_REPORT.md
  [ ] Any file opened during this session

If unsure whether file was read: assume it was. Do not re-read.
If session is new: treat everything as unread.

=====================================
## SECTION 8: RESPONSE FORMAT
=====================================
For code changes: show only changed code block, not whole file
For graph results: summarise in 2-3 lines, do not dump raw JSON
For errors: show only relevant error line, not full stack unless asked
For confirmations: one line — "Done. [what changed]. [what to do next]."
For warnings: one line — "Warning: [Node] has [N] dependents: [list]"

Do NOT explain what you are about to do before doing it
Do NOT summarise what you just did at length
Do NOT add suggestions or next steps unless asked
Do NOT repeat information already given this session

=====================================
## SECTION 9: MODEL SWITCHING
=====================================
Switching between Gemini 3.1 Pro and Claude Opus 4.6:
  Same graphify-out/ folder used by both models
  No rebuild needed when switching
  Session memory resets on model switch
  Re-read GRAPH_REPORT.md once after switching, then track fresh

=====================================
## SECTION 10: QUICK REFERENCE
=====================================
| User says             | Action                                           |
|-----------------------|--------------------------------------------------|
| add a test / feature  | graph → page object → write → STOP              |
| change / fix X        | graph → god node check → 1 file → change → STOP |
| run / execute         | run once → report → STOP                        |
| why failing / which   | /graphify query --dfs --budget 1500 → answer    |
| refactor              | graph → community → change → remind update      |
| add page object       | check graph for duplicate first                  |
| rebuild graph         | /graphify . only if user asked                   |
| update graph          | /graphify . --update only if user asked          |
