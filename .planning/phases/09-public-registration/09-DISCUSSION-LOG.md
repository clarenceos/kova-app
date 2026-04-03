# Phase 9: Public Registration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 09-public-registration
**Areas discussed:** Country dropdown, Event config reveal, Success page data flow, Guard state presentation

---

## Country Dropdown

### Search UX

| Option | Description | Selected |
|--------|-------------|----------|
| Combobox | shadcn/ui Combobox (Popover + Command). Type-to-filter, keyboard navigable. | :heavy_check_mark: |
| Native select + search | HTML select with text filter above. Clunky on mobile. | |
| Autocomplete input | Plain text input with suggestion list. Risk of invalid country entry. | |

**User's choice:** Combobox
**Notes:** User specifically noted "a quick search field would make it more useable"

### Country List Source

| Option | Description | Selected |
|--------|-------------|----------|
| ISO 3166-1 full list | All ~249 countries/territories. Hardcoded array. | :heavy_check_mark: |
| Curated list (~50) | Only countries with active KB sport federations. | |
| IOC country list | ~206 countries recognized by IOC. | |

**User's choice:** ISO 3166-1 full list

### Flag Display

| Option | Description | Selected |
|--------|-------------|----------|
| Flag emoji + name | e.g. "Philippines". Visual scanning aid. | :heavy_check_mark: |
| Name only | Plain text list. | |
| Flag + ISO code + name | e.g. "PH — Philippines". Most info-dense. | |

**User's choice:** Flag emoji + name

---

## Event Config Reveal

### Reveal Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Inline expand | Checking event reveals selectors below checkbox. Unchecking collapses. | :heavy_check_mark: |
| Card per event | Each checked event becomes a bordered card. Heavier UI. | |
| All always visible | Show all 3 events' config always, disabled when unchecked. | |

**User's choice:** Inline expand

### Bell Weight Default

| Option | Description | Selected |
|--------|-------------|----------|
| No default — must select | Placeholder "Select bell weight". Prevents wrong-weight submission. | :heavy_check_mark: |
| Default to first option | Auto-selects lightest. Risk of unnoticed default. | |

**User's choice:** No default — must select

### Single Duration Display

| Option | Description | Selected |
|--------|-------------|----------|
| Static text | Shows "Duration: 10 min" as non-interactive text. | :heavy_check_mark: |
| Hide duration row | Don't show field when only one option. | |

**User's choice:** Static text

---

## Success Page Data Flow

### Data Transfer Method

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect with registrant ID | Server action returns registrantId, client redirects with query param. Server component fetches. | :heavy_check_mark: |
| Client-side state | Pass data via router state. Lost on refresh. | |
| Server action redirect | Server-side redirect(). Less control over loading. | |

**User's choice:** Redirect with registrant ID

### Access Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Any registrant ID | Anyone with URL can view. Acts as receipt. | :heavy_check_mark: |
| Session-scoped only | Only accessible in same browser session. | |

**User's choice:** Any registrant ID

---

## Guard State Presentation

### Visual Treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Branded card with message | Same layout as form, competition name + status message. | :heavy_check_mark: |
| Full-page message | Large centered text, no card. | |
| Next.js not-found page | Default 404 for all guard states. | |

**User's choice:** Branded card with message

### Not Found Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Next.js notFound() | Standard 404 with correct HTTP status. | :heavy_check_mark: |
| Branded card with 'not found' | Same card layout, "Competition not found." Returns 200. | |

**User's choice:** Next.js notFound()

---

## Claude's Discretion

- Event expand/collapse animation (CSS transition vs instant)
- Combobox implementation details (install shadcn Command or lighter)
- Form validation style (inline per-field vs toast vs summary)
- Loading/submitting state indicator
- Country constants file structure (with/without ISO codes)
- Success page visual design details

## Deferred Ideas

None — discussion stayed within phase scope
