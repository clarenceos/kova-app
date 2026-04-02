# Feature Research

**Domain:** Competition registration and queue scheduling — v2.0 milestone for Kova kettlebell sport PWA
**Researched:** 2026-04-02
**Confidence:** HIGH (QUEUE_SPEC.md is fully detailed; competitor analysis confirms table stakes; scheduling algorithm is deterministic and well-specified)

---

## Scope Note

This document covers only the NEW features in the v2.0 Queue System milestone. Existing Kova features (recorder, judge interface, serial number system, athlete profile) are built and working. The scope is:

1. Competition creation form (`/organizerdb/create`)
2. Public athlete registration form (`/registration/[compId]`)
3. Organizer dashboard with registrations table and analytics (`/organizerdb`)
4. Scheduling algorithm and timetable view (`/organizerdb/queue`)
5. CSV bulk import

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features organizers and athletes assume exist. Missing these = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Competition creation form with name, date, and platform count | Every competition management platform (Competition Corner, ManageMyComp, OpenLifter) starts with a competition record. Without it, registration has no target. | LOW | Single-column form. Fields spec'd in QUEUE_SPEC.md. Serial prefix derived server-side from competition name. |
| Public registration link that works without login | Athletes register via organizer-shared URL. Registration must be frictionless — no account creation, no Clerk auth required. Organizer distributes this link through WhatsApp/email. | LOW | R1 in QUEUE_SPEC.md: no auth on new pages. Route is `/registration/[compId]` — dynamic and public. |
| Registration guard states (closed, full, not found) | Every sports registration platform shows clear status when a competition is not open: CrossFit shows "Registration Closed," Competition Corner shows capacity warnings. Athletes arriving at a closed link must get a clear message. | LOW | Four states: not found (404), status !== 'open', deadline passed, max reached. All render before the form. |
| Per-event selections with bell weight and duration | KB sport registration always collects event + bell weight together — they are inseparable (LC with 2x16 is a different division than LC with 2x20). Organizer controls which weights and durations are allowed. | MEDIUM | Checkbox → reveals bell weight dropdown + duration selector. Weights filtered by event type (double bell vs single bell). Duration is static if competition rule is '10' or '5'. |
| Serial number assignment and display on success page | Serial is the trust anchor in Kova — athletes must receive their serials at registration so they can use them in the recorder. Competition Corner shows a confirmation page with all entry details. | LOW | Transaction: create registrant + N entries + assign serials server-side. Success page shows Event/Bell Weight/Duration/Serial table. "Screenshot your serials" instruction is critical UX. |
| Registrations table on organizer dashboard | Every platform (Competition Corner, ManageMyComp, GameDay) provides a full registrants list. Organizer needs to see who has registered before generating a queue. | MEDIUM | Columns: #, Full Name, Gender, Bodyweight, Country, Events (pills), Club, Coach, Registered At, Actions. Sortable by name/bodyweight/date. Filterable by event and gender. |
| Analytics summary bar | Competition Corner, Reviewr, and similar platforms all show aggregate counts at the top of the dashboard. Organizer needs to see total registrations, event breakdown, and gender split at a glance without scanning the table. | LOW | Total registrations, LC/Jerk/Snatch counts, gender split, spots remaining (if cap set), deadline countdown (if set). All derived from registrants table on server. |
| Competition selector dropdown | Organizer manages multiple competitions over time. A competition selector on the dashboard is the standard pattern across all competition management platforms. Without it, the dashboard only works for one competition forever. | LOW | Dropdown: name + date + status badge. "New Competition" button. Selected competition drives all dashboard data. |
| Remove registrant action | Organizers need to be able to remove scratched athletes or test registrations. All platforms support deletion of registrations, typically with confirmation. | LOW | Deletes registrant + all their entries (cascade). No undo (acceptable for v1). Confirmation dialog before deletion. |
| Generate Queue button with start time input | The transition from registration → scheduling is a discrete organizer action in all sports platforms. The organizer decides when to generate the queue and what time the competition starts. The start time is required input. | LOW | Button enabled when ≥1 registrant. Modal with time picker (HH:MM). On confirm, navigates to `/organizerdb/queue?compId=[id]&startTime=[HH:MM]`. |
| Timetable view with time, block number, platform columns | The generated queue is a timetable. Every competition management platform renders this as a time-indexed grid with one row per block (time slot) and one column per platform. Competition Corner, OpenLifter, and Lift Complete all use this pattern. | MEDIUM | Columns: Time, Block #, Platform 1…N. Each cell: Last Name, First Name (Event) · bell weight · weight category · club. Background tinted by event type. |
| Print-friendly timetable | Organizers print the start list and post it physically at the venue or share it as a PDF. Competition Corner has one-click heat schedule print. OpenLifter generates a printable start list. This is the primary deliverable organizers need. | LOW | `@media print` CSS: hide nav, buttons, conflict panel header controls. Preserve grid. Print/Export PDF button triggers `window.print()`. |
| Conflict warnings displayed before the timetable | No competition scheduling tool presents a timetable without flagging conflicts. The organizer must know before they publish the schedule. Rest conflicts (same athlete not enough rest) and coach conflicts (coach is also lifting) are the two relevant types for KB sport. | MEDIUM | Conflict panel above timetable: RED for rest conflicts, AMBER for coach conflicts. Soft warnings — organizer can proceed. Format matches QUEUE_SPEC.md specification. |

### Differentiators (Competitive Advantage)

Features that set Kova apart from generic competition management tools and from the manual spreadsheet workflows KB sport organizers currently use.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Sort order matching KB sport protocol (LC → Jerk → Snatch, 10min before 5min, Female first) | Every other generic scheduling tool requires the organizer to configure sort order manually. KB sport has a universal protocol that Kova should encode automatically. Organizers currently do this in Excel. Getting the default sort order right removes the #1 manual step. | LOW | Pure function in scheduler: sort by event group → duration → gender → weight category. This is the entire sort order — no configuration required. |
| Weight class derivation at display time (never stored) | OpenLifter and ManageMyComp require organizers to enter or assign weight classes. Kova derives them automatically from body_weight_kg at render time. Less data entry, fewer errors, and body weight input naturally drives the division display. | LOW | `lib/queue/weightClass.ts` helper. QUEUE_SPEC.md specifies exact class boundaries for M and F. Display only — weight class is never stored in DB. |
| Copyable registration link immediately after competition creation | Organizers share registration links via WhatsApp and messaging apps. Competition Corner requires navigating to a settings page to find the link. Kova should surface it immediately on redirect after creation, as a copyable input. This eliminates the "where do I find the link?" support question. | LOW | After create → redirect to `/organizerdb` → show success toast or inline card with copyable link. `/registration/[compId]` is the link. |
| Biathlon/Triathlon handled transparently (multiple entries per registrant) | KB sport athletes doing Biathlon register as two separate entries (Jerk + Snatch). Most generic platforms require separate registrations. Kova's data model natively supports multiple entries per registrant from a single form submission. Athletes register once, select multiple events, get multiple serials. | LOW | One form, checkbox events, N entries created in transaction. Success page lists all serials. Scheduler treats each entry independently. |
| Conflict detection scoped to the KB sport context (rest gap + coach conflict) | Generic scheduling software supports venue/resource double-booking conflicts. KB sport has two sport-specific conflicts: same athlete needing rest between events, and a coach who is also lifting. Kova should encode these domain rules rather than generic constraints. | MEDIUM | Two conflict types specified in QUEUE_SPEC.md. REST: block2 - block1 ≤ minRestBlocks (default 2). COACH: athlete.coach field appears in athlete full names list for the same block. |
| CSV import for organizer-collected pre-registrations | Many KB competitions currently collect registrations via Google Forms/spreadsheets before having a digital platform. CSV import means Kova is immediately useful for competitions that started registration elsewhere. No other KB-specific platform offers this workflow. | MEDIUM | File picker, parse client-side, show import summary (rows parsed, errors), submit to server action. Format specified in QUEUE_SPEC.md. Import errors shown per-row. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Payment collection at registration | Organizers charge entry fees. Competition Corner, Eventbrite, and most platforms collect payment at registration. | PCI compliance, Stripe setup, refund workflows, tax handling — adds weeks of scope for v1. KB sport competitions are small; organizers already handle payment out-of-band. | Link to external payment (PayPal, bank transfer) in confirmation email or competition description. Do not build payment in v1. |
| Real-time registration notifications (WebSocket/SSE) | Organizers want to see new registrations appear live without refreshing. | Async competition registrations trickle in over days. WebSocket infrastructure for a feature where data changes once per hour is complete overkill. | Standard page refresh or a manual "refresh" button. Registration is not a live event. |
| Drag-and-drop manual schedule editing | Competition Corner offers heat drag-and-drop. Organizers want to override the auto-schedule. | Auto-schedule with conflict detection covers 95% of cases. Manual editing requires a significantly more complex UI (drag-and-drop grid), state management, and re-conflict-checking after each move. | Organizer regenerates the queue with a different start time or edits registrations, then re-generates. Simpler and sufficient for async KB sport. |
| Email confirmations sent to athletes on registration | Standard in most registration systems. Athletes expect to receive a confirmation email. | Requires an email service integration (Resend, SendGrid) and email templates. For v1, the success page with serial numbers is the confirmation. | Success page instructs athletes to screenshot/save their serials. Add email later as a clear v1.x enhancement when organizers request it. |
| Age divisions (Junior/Open/Masters/Veterans) | KB federations do use age categories at larger events. | Not in the QUEUE_SPEC.md spec. Age adds a third segmentation axis to the timetable beyond gender + weight. Adds form field complexity and scheduler sort complexity. | Body weight + gender divisions cover v1. Add age division as a configurable option when organizers request it. |
| Multiple organizers per competition (team access) | Larger events have multiple staff. | Requires organization/role management within competitions, permission models, and multi-user auth flows. Way beyond scope for a single-organizer MVP. | Single organizer per competition. Share the admin URL with a trusted co-organizer if needed. |
| Registration editing by athletes after submission | Athletes make mistakes and want to change bell weight or event. | Editing after serial assignment breaks the serial-entry relationship and potentially the video overlay that already baked in the serial. The serial is Kova's trust mechanism — it must not be mutable after generation. | Organizer removes the registrant and the athlete re-registers. Documented in the UX as "contact your organizer if you need to change your entry." |
| Auto-publish queue to athletes | Organizers want athletes to see their start time automatically. | Requires a public-facing queue URL, athlete notification, and a clean permission model for what athletes can see before the organizer is ready to publish. | Organizer exports/prints the queue and shares it manually. Kova generates the artifact; distribution is the organizer's responsibility in v1. |
| Weight class as a stored field | Some platforms store the weight class directly on the entry. | It becomes stale if an organizer corrects body weight. Also requires the organizer to calculate it at entry time. | Derive at display time from `body_weight_kg`. QUEUE_SPEC.md explicitly calls this out: "Display only, never stored." |

---

## Feature Dependencies

```
[Competition creation]
    └──required by──> [Public registration link exists]
                          └──required by──> [Athlete registration form]
                                                └──required by──> [Registrant rows in DB]
                                                                      └──required by──> [Organizer dashboard registrations table]
                                                                      └──required by──> [Generate Queue button enabled]
                                                                                            └──required by──> [Scheduling algorithm runs]
                                                                                                                  └──required by──> [Timetable view]
                                                                                                                  └──required by──> [Conflict panel]

[Competition status = 'open']
    └──gates──> [Registration form renders (not the "closed" guard)]

[allowed_bell_weights on competition]
    └──drives──> [Bell weight options in registration form]

[serial_prefix on competition]
    └──drives──> [Serial number generation at registration submit]

[CSV import]
    └──equivalent path to──> [Athlete registration form]
    └──feeds into──> [Same registrant + registration_entries tables]

[body_weight_kg on registrant]
    └──drives──> [Weight class display on timetable]
    └──drives──> [Scheduler sort order by weight category]
```

### Dependency Notes

- **Competition must exist before registration link is shareable.** The registration route `/registration/[compId]` requires a valid `compId`. Create competition first, share link second.
- **Competition status gate is enforced server-side.** The form should not render if `status !== 'open'` or deadline passed or capacity reached. Server-side check (not client-side) prevents direct URL access to a closed registration.
- **Serial prefix is competition-scoped.** Two competitions can share the same prefix if derived the same way, but serial numbers are still unique because they are scoped to `competition_id` in the sequence. The UNIQUE constraint on `serial` prevents collisions across all competitions.
- **Scheduling algorithm requires no DB calls.** It operates on pre-fetched `RegistrationEntryWithRegistrant[]`. The server action fetches all entries for the selected competition and passes them to the pure function. This design (specified in R6) makes the algorithm testable and independent.
- **CSV import is a parallel entry path, not a separate system.** It creates the same `registrants` and `registration_entries` rows as the self-registration form. Serials are assigned in the same transaction. The import result feeds directly into the same dashboard table.
- **Weight class is a display concern, not a scheduling concern.** The scheduler sorts by weight category string derived at scheduling time via `weightClass.ts`. The category is never written to the DB. This means organizer corrections to body weight are reflected immediately on re-generate.

---

## MVP Definition

### Launch With (v1)

The complete v2.0 scope as specified in QUEUE_SPEC.md. All five route groups must ship together — they form a complete organizer workflow.

- [ ] `/organizerdb/create` — Competition creation form with all fields, serial prefix derivation, redirect to dashboard with copyable link
- [ ] `/registration/[compId]` — Public athlete registration form with guard states, per-event bell weight/duration selectors, server-side serial assignment in transaction
- [ ] `/registration/[compId]/success` — Confirmation page with serial table and "screenshot your serials" instruction
- [ ] `/organizerdb` — Dashboard with competition selector, analytics bar, registrations table (sortable, filterable), remove action, CSV import, Generate Queue button with start time modal
- [ ] `/organizerdb/queue` — Timetable view with conflict panel (REST + COACH), event-tinted rows, weight class column, print-friendly CSS
- [ ] `lib/queue/scheduler.ts` — Pure scheduling function: sort → block assignment → conflict detection
- [ ] `lib/queue/weightClass.ts` — Weight class derivation helper for M and F

### Add After Validation (v1.x)

Features to add once organizers have used the system for one competition.

- [ ] Email confirmation to athletes on registration — add when organizers report athletes asking "did my registration go through?"
- [ ] Age division field on registration and age-category sort in scheduler — add when organizers running larger federations request it
- [ ] Public queue view for athletes (read-only, no organizer tools) — add when organizers want to share start lists without sharing dashboard access
- [ ] Organizer authentication (Clerk role gate on `/organizerdb` routes) — auth is intentionally deferred per R1 in QUEUE_SPEC.md; add as a follow-on when multi-user or access control is needed

### Future Consideration (v2+)

- [ ] Payment collection at registration — add when Kova targets larger-scale competitions where entry fees are managed in-platform
- [ ] Drag-and-drop manual queue editing — add if auto-schedule generates too many conflicts for a specific competition format
- [ ] Automatic schedule publishing to athletes via push notification — add when PWA notification infrastructure (Serwist) is in place
- [ ] Multi-organizer access per competition — add when clubs run competitions with multiple staff

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Competition creation form | HIGH | LOW | P1 |
| Public registration form with guard states | HIGH | MEDIUM | P1 |
| Serial assignment on registration | HIGH | LOW | P1 |
| Registration success page with serials | HIGH | LOW | P1 |
| Organizer dashboard — registrations table | HIGH | MEDIUM | P1 |
| Analytics summary bar | MEDIUM | LOW | P1 |
| Competition selector | HIGH | LOW | P1 |
| Generate Queue button + start time modal | HIGH | LOW | P1 |
| Scheduling algorithm (pure function) | HIGH | MEDIUM | P1 |
| Timetable view (time grid + platform columns) | HIGH | MEDIUM | P1 |
| Conflict panel (REST + COACH warnings) | HIGH | LOW | P1 |
| Print-friendly timetable | HIGH | LOW | P1 |
| CSV import | MEDIUM | MEDIUM | P1 |
| Remove registrant action | MEDIUM | LOW | P1 |
| Weight class derivation helper | HIGH | LOW | P1 |
| Email confirmation to athletes | MEDIUM | MEDIUM | P2 |
| Age divisions | MEDIUM | MEDIUM | P2 |
| Public queue view for athletes | MEDIUM | MEDIUM | P2 |
| Auth gate on organizer routes | HIGH | LOW | P2 |
| Drag-and-drop schedule editing | LOW | HIGH | P3 |
| Payment collection | LOW | HIGH | P3 |

**Priority key:**
- P1: Ships in v2.0 milestone
- P2: v1.x — add after one real competition runs on the platform
- P3: v2+ — only if strong demand

---

## Competitor Feature Analysis

| Feature | Competition Corner | ManageMyComp / OpenLifter | Kova v2.0 Approach |
|---------|-------------------|---------------------------|---------------------|
| Registration form | Configurable, custom fields, multi-language, payment | Manual entry by meet director (no public form) | Public form, no auth required, event-driven bell weight/duration selection |
| Serial / bib assignment | Bib assigned at check-in or by organizer | Bib/flight number is manual | Serial assigned server-side in transaction at registration time — links back to Kova recorder overlay |
| Start list / queue | Drag-and-drop heat assignment, graphical | Flight order by weight attempts | Greedy sequential assignment by KB sport protocol sort order; pure function, deterministic, re-runnable |
| Conflict detection | Not documented for individual athlete rest gaps | Not applicable (concurrent flight) | REST conflict (same athlete, insufficient gap) + COACH conflict (athlete is also listed as coach) |
| Timetable output | One-click heat schedule print, scorecard export | Printable start list | Print-friendly CSS grid; event-tinted rows; weight class derived at render; no nav/buttons in print |
| CSV import | Export only (CSV/Excel/JSON) | Import from spreadsheet for some platforms | CSV import with defined column format; client-side parse + server action; import summary shown |
| Analytics | Registration counts, division breakdown | Not featured | Total, per-event, gender split, spots remaining, deadline countdown — all inline on dashboard |
| Weight class | Organizer defines divisions manually | Organizer assigns division | Auto-derived from `body_weight_kg` using QUEUE_SPEC.md boundary tables; never stored |
| Auth | Full auth (athletes create accounts) | Local software, no web auth | No auth on new routes (R1); Clerk auth can be added later without rewrites |

---

## Existing Kova Dependencies

These v1 features are already built and must integrate cleanly with v2.0.

| Existing Feature | How v2.0 Depends On It |
|-----------------|------------------------|
| Serial number format (XXX-0000) | LOCKED CONVENTION. v2.0 uses the same format with competition-scoped prefix derived from competition name. The format must not change. |
| Drizzle schema (`lib/schema.ts`) | v2.0 adds 3 new tables (`competitions`, `registrants`, `registration_entries`) without modifying `scores` or `profiles`. |
| `@libsql/client/http` import | All new DB code must use the HTTP client, not WebSocket. Matches existing pattern in `lib/db.ts`. |
| Server actions pattern | All mutations go through `'use server'` functions in `app/actions/`. No API routes. Matches R5 in QUEUE_SPEC.md. |
| shadcn/ui + Tailwind CSS tokens | All new pages use existing design tokens. Desktop-first layout for organizer routes (R2). No new UI libraries (R3). |
| Clerk auth infrastructure | R1 defers auth on new routes but code must be structured so Clerk can be added later. No hardcoded user IDs or organizer checks. |

---

## Sources

- [Competition Corner Features](https://about.competitioncorner.net/features) — registration, heat management, CSV export, one-click print — HIGH confidence (direct fetch)
- [ManageMyComp](https://www.managemycomp.com/) — start list management for powerlifting/olympic lifting — MEDIUM confidence (direct fetch)
- [OpenLifter](https://www.openlifter.com/en/) — free open-source meet software; start list, flight order, printable results — MEDIUM confidence (WebSearch)
- [OWLCMS](https://jflamy.github.io/owlcms4/) — Olympic weightlifting competition management; start list, weigh-in, attempt board — MEDIUM confidence (WebSearch)
- [Fastbreak AI: Coach Conflict Scheduling Software](https://www.fastbreak.ai/blog/coach-conflict-rest-time-scheduling-software) — rest-time conflict detection, coach conflict logic — MEDIUM confidence (WebSearch)
- [G2: Athletic Competition Management Software (April 2026)](https://www.g2.com/categories/athletic-competition-management) — category overview of competition management platforms — LOW confidence (search results summary only)
- [Reviewr: Competition Lifecycle Management](https://www.reviewr.com/competition-lifecycle-management-software/) — organizer dashboard, registrations table patterns — LOW confidence (search results summary only)
- [Roster Athletics: CSV Import for Athletes](https://support.rosterathletics.com/en/support/solutions/articles/44001359909-add-athletes-from-a-csv-file) — CSV column conventions for athlete import — MEDIUM confidence (WebSearch)
- [QUEUE_SPEC.md](../QUEUE_SPEC.md) — full requirements spec for v2.0 — HIGH confidence (project document)
- [.planning/PROJECT.md](../PROJECT.md) — v2.0 goals and constraints — HIGH confidence (project document)

---

*Feature research for: Kova v2.0 — Competition registration and queue scheduling*
*Researched: 2026-04-02*
