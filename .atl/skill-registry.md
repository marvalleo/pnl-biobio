# Skill Registry - webpnl

This registry identifies all available skills for this project.

## Project Standards (auto-resolved)

### General Protocol (All Tasks)
- Follow Rioplatense Spanish (voseo) for communications.
- Prioritize visual excellence in all UI changes.
- Never add AI attribution to commits.
- Architecture: HTML/JS (Frontend) + Supabase Edge Functions (Backend) + Netlify.

### Mass Email Standards
- **Provider**: Resend API.
- **Verification**: Mandatory domain DNS (SPF, DKIM, DMARC) before mass sending.
- **Constraints**: 100 emails/day limit on free tier; use Batch API for +1 recipient.

---

## Skill Triggers

| Skill | Pattern | Trigger Context |
|-------|---------|-----------------|
| branch-pr | `*/SKILL.md` | PR creation, opening a PR, or preparing changes for review. |
| go-testing | `*.go` | Writing Go tests (Inactive: no Go testing in this project). |
| issue-creation | `*/SKILL.md` | Creating a GitHub issue, reporting a bug, or requesting a feature. |
| judgment-day | `judgment day`, `review adversarial` | User requests adversarial review or validation. |
| sdd-* | `openspec/`, `sdd-*` | Spec-Driven Development cycles (Init, Explore, Propose, Spec, Design, Tasks, Apply, Verify, Archive). |

## Compact Rules

### sdd-apply
- Implement following specs/design strictly.
- Use Vanilla JS + Tailwind CDN for frontend.
- Maintain Supabase config with system retries.

### judgment-day
- Parallel adversarial review protocol.
- Blind judge synthesis and automatic fixes.
