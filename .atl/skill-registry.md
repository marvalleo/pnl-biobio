# Skill Registry - webpnl

This registry identifies all available skills for this project.

## Project Standards (auto-resolved)

### General Protocol (All Tasks)
- Follow Rioplatense Spanish (voseo) for communications.
- Prioritize visual excellence in all UI changes.
- Never add AI attribution to commits.
- Follow Clean Architecture principles where applicable.

---

## Skill Triggers

| Skill | Pattern | Trigger Context |
|-------|---------|-----------------|
| branch-pr | `*/SKILL.md` | PR creation, opening a PR, or preparing changes for review. |
| go-testing | `*.go` | Writing Go tests, using teatest, or adding test coverage. |
| issue-creation | `*/SKILL.md` | Creating a GitHub issue, reporting a bug, or requesting a feature. |
| judgment-day | `judgment day`, `review adversarial` | User requests adversarial review or validation. |
| skill-creator | `*/SKILL.md` | Creating new skills or documenting patterns for AI. |

## Compact Rules

### branch-pr
- Use conventional commits.
- Link issues in the PR description.
- Follow Agent Teams Lite issue-first enforcement.

### go-testing
- Use Bubbletea TUI testing patterns when applicable.
- Ensure 80% coverage for new code.

### judgment-day
- Launches two blind judges to review.
- Synchronizes fixes and re-judges.
