---
trigger: always_on
---

# Agent Rules (STRICT)

## UI Safety (Highest Priority)

- DO NOT modify any UI, layout, styling, spacing, or design unless explicitly requested.
- NEVER redesign, refactor, or "improve" the UI on your own.
- Keep all existing Tailwind classes, DOM structure, and component hierarchy EXACTLY the same.
- Only change the specific part mentioned in the request.

## Minimal Changes Only

- Apply the smallest possible patch.
- DO NOT touch unrelated files or code.
- Avoid refactoring or cleanup unless asked.

## Comment Requirements (MANDATORY)

Every change MUST include comments.

Format:
[ADD] new feature
[FIX] bug fix
[MOD] modification
[DEL] removal

Examples:
// [ADD] add map connection logic
// [MOD] update button click handler to call API

Explain WHAT and WHY.

## Workflow

- First explain the plan briefly
- Then modify code
- If unsure, ASK before changing
