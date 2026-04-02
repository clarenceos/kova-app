# Phase 8: Competition Creation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 08-competition-creation
**Areas discussed:** Post-creation landing, Serial prefix preview, Registration link format, Form validation UX

---

## Post-creation Landing

| Option | Description | Selected |
|--------|-------------|----------|
| Competition list page | Simple page listing all competitions with name, date, status badge, and copyable registration link per comp. Plus 'New Competition' button. Phase 10 evolves this into the full dashboard. | ✓ |
| Success redirect only | No /organizerdb page in Phase 8. Redirect to /organizerdb/success?compId=X showing just the new competition's details and registration link. | |
| Minimal dashboard shell | Build /organizerdb with competition dropdown selector and 'New Competition' button but leave analytics/table/CSV as empty states. | |

**User's choice:** Competition list page
**Notes:** Phase 10 evolves this into the full dashboard with analytics, registrations table, CSV import, and queue generation.

---

## Serial Prefix Preview

| Option | Description | Selected |
|--------|-------------|----------|
| Live preview | Show derived prefix below the name field as the user types. Uses existing deriveSerialPrefix client-side. | ✓ |
| Compute on submit only | Prefix derived silently on submit. Organizer sees it for the first time on the competition list page. | |
| Editable preview | Show derived prefix as a pre-filled text field that the organizer can override. | |

**User's choice:** Live preview
**Notes:** Uses deriveSerialPrefix from lib/queue/serial.ts. Gives organizer confidence before submitting.

---

## Registration Link Format

| Option | Description | Selected |
|--------|-------------|----------|
| Full URL with origin | Use window.location.origin + '/registration/' + compId. Works when shared externally. | ✓ |
| Relative path only | Show '/registration/abc123'. Recipients can't click it directly. | |

**User's choice:** Full URL with origin
**Notes:** Ensures link works when shared via WhatsApp, email, social media.

---

## Form Validation UX

### Validation display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline per-field | Red text below each invalid field on submit. Standard pattern for single-column forms. | ✓ |
| Toast notification | Show a toast with all errors listed. | |
| Summary banner at top | Red banner at top listing all errors with anchor links. | |

**User's choice:** Inline per-field

### Bell weight validation

| Option | Description | Selected |
|--------|-------------|----------|
| Require at least one | Validation error if all bell weights are unchecked. | ✓ |
| Allow empty | Let organizer save with no bell weights. | |

**User's choice:** Require at least one
**Notes:** A competition with no allowed weights is nonsensical.

---

## Claude's Discretion

- Form component architecture (single component vs split into sections)
- shadcn/ui form primitives usage
- Server action error handling patterns
- Competition card design details
- Whether to show serial prefix on competition cards

## Deferred Ideas

None — discussion stayed within phase scope
