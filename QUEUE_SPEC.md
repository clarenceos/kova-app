# Kova Queue System — Project Brief

## Project Context

This is a new feature being added to an existing Next.js app called Kova — a PWA competition judging platform for kettlebell sport.

Before doing anything, read these files:
- `.claude/kova-context.md` — current phase, stack, what's built
- `.claude/kova-decisions.md` — locked technical decisions, do not contradict
- `.claude/kova-brand.md` — brand and visual language
- `.claude/kova-patterns.md` — established code patterns

Stack: Next.js App Router, Tailwind CSS, Turso (libSQL) + Drizzle ORM, Clerk auth, Vercel.

---

## What We're Building

A competition registration and queue scheduling system for kettlebell sport competitions.

User flows:
1. Organizer creates a competition with rules (platforms, durations, bell weights)
2. Organizer shares a registration link with athletes
3. Athletes register themselves via the public link
4. Organizer reviews registrations on a dashboard
5. Organizer generates a timetable — the system auto-schedules athletes and flags conflicts

---

## Requirements

R1 — No authentication required on any new pages. Structure code so Clerk auth can be added later without rewriting. Do not hardcode user IDs or organizer checks.

R2 — Desktop/PC browser first. Do not build mobile-specific layouts.

R3 — Follow existing Kova UI exactly. Use existing design tokens, component patterns, Tailwind conventions, and global nav. Do not introduce new UI libraries.

R4 — Do not modify existing tables. Add 3 new Drizzle tables only.

R5 — Use server actions, not API routes. Consistent with existing Kova patterns.

R6 — Scheduling algorithm must be a pure function in lib/queue/scheduler.ts. No DB calls inside it.

---

## Routes

/organizerdb — Organizer dashboard: registrations, analytics, generate queue
/organizerdb/create — Create a new competition
/organizerdb/queue — View generated timetable
/registration/[compId] — Public athlete registration form
/registration/[compId]/success — Confirmation with serial numbers

---

## Data Model

Add to lib/schema.ts. Do NOT modify existing tables. Use cuid2 for all ids.

Table: competitions
- id: text PRIMARY KEY (cuid2)
- name: text NOT NULL
- date: text NOT NULL (ISO date string)
- num_platforms: integer NOT NULL DEFAULT 3
- allowed_durations: text NOT NULL ('both' | '10' | '5')
- allowed_bell_weights: text NOT NULL (JSON string e.g. '["2x8","2x12"]')
- max_registrants: integer (nullable)
- registration_deadline: text (nullable, ISO datetime)
- serial_prefix: text NOT NULL (3-char uppercase)
- status: text NOT NULL DEFAULT 'draft' ('draft' | 'open' | 'closed')
- created_at: text NOT NULL

Table: registrants (one row per person per competition)
- id: text PRIMARY KEY (cuid2)
- competition_id: text NOT NULL REFERENCES competitions(id)
- last_name: text NOT NULL
- first_name: text NOT NULL
- gender: text NOT NULL ('Male' | 'Female')
- body_weight_kg: real NOT NULL
- country: text NOT NULL
- club: text (nullable)
- coach: text (nullable)
- created_at: text NOT NULL

Table: registration_entries (one row per event entered)
- id: text PRIMARY KEY (cuid2)
- registrant_id: text NOT NULL REFERENCES registrants(id)
- competition_id: text NOT NULL REFERENCES competitions(id)
- event: text NOT NULL ('LC' | 'JERK' | 'SNATCH')
- bell_weight: text NOT NULL (e.g. '2x16' or '1x16')
- duration: integer NOT NULL (10 or 5)
- serial: text NOT NULL UNIQUE
- status: text NOT NULL DEFAULT 'registered' ('registered' | 'scratched' | 'dns')
- created_at: text NOT NULL

---

## Serial Number Format

LOCKED KOVA CONVENTION: XXX-0000. Do not change this format.

Prefix (XXX): First letter of each word in competition name, uppercased, non-alpha stripped, max 3 chars.
- "Girya Pilipinas Cup" → GPC
- "IKO Asian Championships" → IAC
- "Hunger Bells" → HUB
- "Manila Open" → MAN (pad with first 3 letters of first word if fewer than 3 words)

Number (0000): Sequential integer scoped to competition, zero-padded to 4 digits.
Count existing registration_entries for this competition_id, increment by 1.
e.g. GPC-0001, GPC-0002, GPC-0003

Assigned server-side in a DB transaction. Never client-side.
Serials are NOT displayed on the timetable/queue view.

---

## Page Specs

### /organizerdb/create
Single-column form, desktop centered, standard Kova layout.

Fields:
- Competition Name (text, required)
- Date (date picker, required)
- Number of Platforms (number, min 1 max 10, default 3)
- Status (radio: Draft / Open, default Draft)
- Max Registrants (number, optional)
- Registration Deadline (datetime picker, optional)
- Duration Rule (radio): "Both 5 and 10 min" / "10 min only" / "5 min only"
- Allowed bell weights — two checkbox sections, all checked by default, Select All / Deselect All per section:
  Double Bell (LC & Jerk): 2x8, 2x12, 2x16, 2x20, 2x24, 2x28, 2x32, 2x36, 2x40
  Single Bell (Snatch): 1x8, 1x12, 1x16, 1x20, 1x24, 1x28, 1x32

On submit: derive serial_prefix, save to DB, redirect to /organizerdb, show copyable registration link.

### /registration/[compId]
Centered card, max-width ~640px. Show competition name and date at top.

Guard states (show message, no form):
- Not found → 404
- status !== 'open' → "Registration is closed"
- Deadline passed → "Registration is closed"
- Max registrants reached → "This competition is full"

Form fields in order:
1. Last Name (required)
2. First Name (required) — helper: "If you go by a single name (e.g. Suharto), enter it in both fields."
3. Gender (radio: Male / Female, required)
4. Current Body Weight in kg (number, 2 decimal places, required)
5. Country (searchable dropdown, required)
6. Events (checkboxes, at least one required): LC / Jerk / Snatch
   Each checked event reveals: Bell Weight dropdown + Duration selector
   LC and Jerk use double bell options from comp's allowed_bell_weights
   Snatch uses single bell options from comp's allowed_bell_weights
   Duration: if 'both' → radio 10min/5min; if '10' → static "10 min"; if '5' → static "5 min"
7. Kettlebell Club (text, optional)
8. Coach (text, optional) — helper: "Only fill in if your coach will be present on competition day."

On submit: create 1 registrant + N entry rows, assign serials in a transaction, redirect to success.

### /registration/[compId]/success
- Kova-branded success state
- "You're registered for [Competition Name]"
- Registrant full name
- Table: Event / Bell Weight / Duration / Serial
- "Screenshot or save your serial numbers. These are your competition identifiers."
- Button: "Register another athlete" → back to form

### /organizerdb
Full-width desktop layout, global nav.

Competition selector: dropdown, shows name/date/status badge. "New Competition" button → /organizerdb/create.

Analytics bar per selected competition:
- Total registrations
- Per-event: LC (n) · Jerk (n) · Snatch (n)
- Gender split: Male (n) / Female (n)
- Spots remaining (if max_registrants set)
- Deadline countdown (if deadline set)

Registrations table columns: # · Full Name · Gender · Bodyweight (kg) · Country · Events · Club · Coach · Registered At · Actions
- Events as small pill badges
- Sortable: name, bodyweight, registered at
- Filterable: event, gender
- Actions: Remove (deletes registrant + all their entries)

CSV Import: file picker, format defined below, shows import summary.

Generate Queue button: enabled when ≥1 registrant. Opens modal with start time input. On confirm → /organizerdb/queue?compId=[id]&startTime=[HH:MM]

### /organizerdb/queue
Full-width, print-friendly (nav and buttons hidden on print).
Receives compId and startTime as query params.

Header: competition name + date, generated timestamp, Print/Export PDF button, Back to Dashboard.

Conflict panel (if conflicts exist) — soft warnings, organizer can proceed:
- RED REST — athlete name, block numbers, gap vs minimum
- AMBER COACH — coach name, student name, block they overlap

Timetable grid: Time · Block # · Platform 1 · Platform N...
Each cell: Last Name, First Name (Event) · bell weight · weight category · club · conflict pill if applicable
Row background tinted by event type per Kova design tokens.

Weight class derivation (display only, never stored):
Female: ≤52→52kg · ≤57→57kg · ≤61→61kg · ≤66→66kg · ≤70→70kg · ≤74→74kg · ≤80→80kg · >80→80+kg
Male: ≤61→61kg · ≤66→66kg · ≤70→70kg · ≤74→74kg · ≤80→80kg · ≤89→89kg · ≤95→95kg · >95→95+kg

---

## Scheduling Algorithm

Pure function in lib/queue/scheduler.ts. No DB calls.

Input:
- entries: RegistrationEntryWithRegistrant[]
- numPlatforms: number
- startTimeMinutes: number (minutes since midnight, 9am = 540)
- blockDuration: number (default 10)
- transitionDuration: number (default 5)
- minRestBlocks: number (default 2)

Output:
- timeBlocks: TimeBlock[]
- conflicts: Conflict[]
- estimatedFinishTime: number

Sort order: event group (LC → Jerk → Snatch) → duration (10min before 5min) → gender (Female first) → weight category alphabetically.

Block assignment: fill numPlatforms slots per block, increment block index. Greedy sequential.

Conflict detection (soft warnings only):
- REST: same athlete in two blocks where block2 - block1 <= minRestBlocks. Flag red.
- COACH: cross-reference registrant.coach field. If a name appears as both athlete and listed coach, check if they share any block. Flag amber.

Weight class helper in lib/queue/weightClass.ts.

Biathlon/Triathlon note: not separate events. Athlete doing Biathlon registers as two entries (JERK + SNATCH). Scheduler treats independently.

---

## CSV Import Format

Headers required. Used on /organizerdb.
Columns: Last Name, First Name, Gender, Body Weight (kg), Country, Events, Bell Weights, Duration, Club, Coach
- Events: comma-separated in one cell e.g. "LC,JERK"
- Bell Weights: comma-separated matching event order e.g. "2x20,2x20"
- Duration: single value for all events in this row e.g. 10
- Club and Coach: optional, can be blank
