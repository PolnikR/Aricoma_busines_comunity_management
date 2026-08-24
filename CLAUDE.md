# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Focused Verification

**Run the smallest verification scope that proves the agent's changes.**

- Identify the changed features, modules, and contracts before selecting test commands.
- Run only the unit, component, hook, API, or integration test files that directly cover the changed behavior.
- Prefer explicit test-file paths, for example `npm exec vitest run <affected-test-files>`.
- Do not run the complete test suite, `npm test`, the complete workspace test suite, or a full production build by default.
- Run a broader or complete suite only when the user explicitly requests it, the change is cross-cutting, or a reliable focused scope cannot be determined.
- Use focused linting for changed files when the tooling supports it. Run full type checking or a production build only when required by the affected scope or explicitly requested.
- In the final response, list the verification commands that were run and clearly state when the complete suite or build was not run.

## 6. Verify and Commit Every Change

**A completed change must be verified and committed before it is handed back.**

- Always run the focused tests or validations relevant to the files changed by the agent.
- For documentation or configuration changes without an automated test, run the closest applicable validation, such as a parser, linter, content assertion, or `git diff --check`.
- Create an atomic Git commit after verification succeeds, using a descriptive commit message.
- Stage only files that belong to the current task. Never include unrelated or pre-existing worktree changes.
- Do not report the task as complete until the commit succeeds. If repository permissions block the commit, report the blocker explicitly and request the required permission.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Agent skills

### Issue tracker

Issues live as GitHub Issues in `PolnikR/Aricoma_busines_comunity_management`, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Standard 5-role vocabulary, label strings equal to role names (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
