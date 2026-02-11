---
name: phase-status
description: Show current phase status and next actions. Run at start of every session.
allowed-tools: Read, Grep, Glob
user-invocable: true
---

Report current project status:

1. Read SOURCE_OF_TRUTH.md for current phase and status
2. Read current phase doc from .claude/phases/PHASE-*.md
3. List active subtasks from .claude/subtasks/active/
4. Check for any blocked items
5. Report:
   - Current phase and status
   - Active subtasks (ID, title, owner, status)
   - Blocked items (if any)
   - Next recommended actions
   - Agent Teams status (if any active)
   - Validation checkpoint status
