# Feature Research

**Domain:** Online asynchronous kettlebell sport competition platform (PWA)
**Researched:** 2026-03-24
**Confidence:** MEDIUM-HIGH (kettlebell sport conventions well-documented; platform UX patterns verified against CrossFit, JudgeMate, Competition Corner; some KB-specific online competition details LOW confidence due to limited public docs)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Athlete onboarding with full name capture | Every judging platform identifies athletes by real name; judges need to know who they're judging | LOW | Clerk `publicMetadata.name`; one-time prompt on first login |
| Discipline selection before recording | Lifters must declare the event (Long Cycle, Jerk, Snatch) and kettlebell weight before starting — this is how all KB sport scoring works | LOW | Three disciplines; weight is athlete-entered (kg) |
| Visible countdown before set begins | Athletes need prep time; all KB sport timers include a configurable countdown | LOW | 5–60s range; AudioContext beep at countdown end |
| 10-minute set timer baked into video | Every online KB competition requires a visible, running clock in the video — CrossFit mandates it, IKMF mandates it, KB World League mandates it | MEDIUM | Canvas overlay; 0:00 → 10:00 format; auto-stop at 10:10 |
| Athlete name + discipline + weight visible in video | Online KB competitions require athlete identification in the video frame (KB World League: "introduce yourself by stating your name") | MEDIUM | Canvas overlay baked in every frame |
| Video review before export | Athletes need to verify the recording captured correctly before uploading to YouTube | LOW | HTML5 video playback of recorded Blob |
| YouTube upload instructions with pre-filled description | YouTube is the de facto CDN for online KB competitions (IKFF, CrossFit, KB World League all use YouTube URL submission) | LOW | Step-by-step instructions + clipboard copy of description string |
| YouTube URL submission for entries | All major online fitness competition platforms (CrossFit Semifinals, IKFF, KB World League) use YouTube URL submission; no other format accepted | LOW | URL input + basic YouTube URL validation |
| Judge: watch YouTube-embedded video | Judges must watch the submission in-platform without downloading — standard pattern across all judging platforms | LOW | `youtube-nocookie.com` iframe embed |
| Judge: rep counter with tap | Judges count reps by tapping — this is the entire judge task for KB sport; CrossFit-style scoring platforms treat score entry as a single integer | MEDIUM | Large tap target; needs undo/decrement; shows live count alongside video |
| Judge: submit final rep count | The score IS the rep count in KB sport; judge submits a single integer | LOW | Confirmation step before final submission; cannot re-submit without organizer |
| Competition with name, date, and disciplines | Every competition management platform (Competition Corner, STACT, JudgeMate) requires at minimum: name, date, event list | LOW | Organizer creates; disciplines as multi-select |
| Weight class and gender divisions | KB sport ALWAYS segments by gender AND bodyweight class (WKSF: Men 58/63/68/73/78/85/95/105/105+kg; Women 58/63/68/68+kg) AND kettlebell weight | MEDIUM | Division = gender + bodyweight class combo; kettlebell weight is a separate field on the entry |
| Athlete self-registration for a competition | Athletes must be able to discover and enter competitions independently — without organizer manually adding each one | LOW | Competition list; register button; one entry per competition per discipline |
| Organizer: assign judges to entries | Judge assignment is a universal feature of all judging platforms (JudgeMate, Competition Corner, RocketJudge, Judgify) | MEDIUM | Match one judge → one entry (v1); judge sees only their assigned entries |
| Live leaderboard (unofficial) | CrossFit Open, Competition Corner, WodWin all show live/preliminary scores before official publication; athletes expect to see where they stand | MEDIUM | Clearly labeled "UNOFFICIAL"; visible as soon as a score is submitted |
| Official results publication | Organizer publishes final results after review — the transition from unofficial → official is a universal pattern (CrossFit Games, Competition Corner) | LOW | Single publish action; timestamps the results |
| Mobile-optimized judge interface | Judges use phones/tablets — this is true across all judging platforms (JudgeMate, STACT, Judging Hub) | MEDIUM | Large tap targets; thumb-reachable layout; no horizontal scroll |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Authenticated video overlay (serial number + verified timer) | No competing KB platform bakes authentication INTO the video stream. Current platforms rely on honor-system date stamps or athlete self-reporting of time visible. Kova's canvas overlay eliminates doubt about timer manipulation | HIGH | Canvas composite: timer + name + discipline + weight + KOVA watermark + unique serial. Serial links back to a DB record. This IS Kova's trust mechanism |
| In-browser recorder (no app install required) | All existing KB sport timer apps are native Android/iOS (AKLU Kettlebell Platform Timer, Kettlebell Sport Counter 2.0, Kettlebell Timer PRO). A PWA that records directly in-browser with no install friction is a meaningful differentiator | HIGH | getUserMedia → canvas → captureStream(30) → MediaRecorder; iOS has MediaRecorder gaps (see Pitfalls) |
| Pre-filled YouTube description with copy-to-clipboard | No existing platform guides athletes through the upload process with auto-generated metadata. Reduces errors in description, ensures serial number is preserved in YouTube metadata | LOW | Template string: name, discipline, weight, date, serial, Kova tagline |
| Minute beep audio cue during recording | KB sport athletes track their pace by the minute; AKLU timer app does this for judges, but no web-based recorder for athletes provides it | LOW | AudioContext oscillator at each minute mark; toggleable |
| Rep count displayed alongside video during judging | Standard judging platforms show only a score input field. Displaying the running count visually while judge taps reduces transcription errors | LOW | Counter display synced to tap events; not common in general judging software |
| PWA installability — home screen icon | Athletes and judges use this repeatedly for every competition; an installable PWA feels like an app without requiring App Store distribution | MEDIUM | `manifest.json` with `display: standalone`; add-to-home-screen prompt guidance (iOS requires manual steps) |
| Organizer can manually add athlete entries | Some athletes may submit outside the platform (email, etc.); organizer override ensures the platform doesn't block legitimate entries | LOW | Form: athlete name, discipline, weight class, YouTube URL |
| Age divisions in leaderboard | CrossFit and all major KB federations segment by age (Junior U18, Open 18–39, Masters 40+, Veterans 50+); not having it limits usefulness for larger competitions | MEDIUM | V1 can omit; add as division option in competition setup when needed |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Server-side video storage (S3/R2) | "Why make athletes upload to YouTube?" | Adds infrastructure cost, storage scaling complexity, GDPR surface area, bandwidth costs, and video transcoding complexity — all for a feature YouTube provides for free with global CDN | YouTube URL submission; athletes upload unlisted videos themselves |
| Multiple judges per entry (v1) | Fairer judging; reduces single-judge error | Requires consensus logic (average? head judge override? dispute workflow?), UI for judge disagreement, and significantly more complex assignment system | One judge per entry in v1; multi-judge with head judge override is explicitly a later milestone |
| Live in-person judging / real-time mode | "What if we want to run an in-person event?" | Requires real-time infrastructure, WebSocket connections, synchronization logic, entirely different UX flows — completely different product | Async-only for v1; in-person is a separate product consideration |
| Native iOS/Android apps | "PWA doesn't feel like a real app" | App store review, separate codebases, distribution costs, updates delayed by review process — none of which is needed for v1 validation | PWA with add-to-home-screen; ServiceWorker for offline; feels native enough |
| Public voting / community scoring | Crowd-sourced rep validation | Gameable; creates noise in scoring; legitimate competitions require qualified judges not crowd votes | Organizer-assigned judge model only |
| AI rep counting from video | "Automate the judging" | Unreliable for KB sport where no-rep calls require human judgment (lockout, hand switch, pause at top); would undermine trust in results | Human judges remain the standard; AI assist could be a v2+ enhancement with human override |
| Payment/registration fees in-app | "Monetize entry fees" | Payment processing (Stripe, etc.) adds PCI compliance overhead, tax complexity, refund workflows; not needed for v1 validation | Out-of-band payment (external link, or organizer handles payment); focus on the judging product first |
| Real-time leaderboard with WebSockets | "Live score updates" | Async competition does not require real-time infrastructure; scores arrive over days, not seconds | Polling or SSE is sufficient; page refresh or short-interval fetch is fine for async competition context |
| Video trimming / editing tools | "Let athletes clean up their video" | Any post-recording edit undermines the authenticated overlay's validity; if athletes can trim, they can potentially cut bad reps | Athletes must re-record if they want a different result; the uncut requirement is explicit in CrossFit and KB World League rules |
| Athlete body weight verification in-app | KB World League and IKMF require athletes to show their body weight on scale in the video | In-app verification would require camera-based weight reading (not feasible) or honor system form field (not trustworthy) | Include this as a video instruction: "show your body weight on a scale before starting" — make it a checklist item in the YouTube instructions screen |

---

## Feature Dependencies

```
[Athlete onboarding / name capture]
    └──required by──> [Canvas overlay with athlete name]
                          └──required by──> [Authenticated video recording]
                                                └──required by──> [Video export]
                                                                      └──required by──> [YouTube submission]

[Competition creation (organizer)]
    └──required by──> [Athlete entry/registration]
                          └──required by──> [Judge assignment]
                                                └──required by──> [Judge interface / rep counting]
                                                                      └──required by──> [Score submission]
                                                                                            └──required by──> [Live leaderboard (unofficial)]
                                                                                                                  └──required by──> [Official results publication]

[Weight/gender divisions on competition]
    └──required by──> [Leaderboard segmentation by division]

[Serial number generation]
    └──required by──> [Canvas overlay with serial]
    └──required by──> [Entry linking: serial → DB record]

[YouTube URL on entry]
    └──required by──> [Judge interface: embedded video playback]
```

### Dependency Notes

- **Athlete name requires onboarding:** Canvas overlay references `publicMetadata.name`; if name is missing the overlay renders incomplete. Onboarding gate must fire before recorder is accessible.
- **Competition divisions required for leaderboard:** Leaderboard cannot segment without divisions being defined at competition-creation time. Retroactive division changes are hazardous.
- **Serial number is the trust chain anchor:** The serial links the video overlay to a DB record (athlete, discipline, weight, timestamp). Without it, the overlay is decorative only.
- **YouTube URL gating judge access:** Judge cannot be assigned or start reviewing until the athlete has submitted a YouTube URL. Assignment before URL submission is a workflow edge case to handle gracefully (show "awaiting video" state).
- **Judge assignment before scoring:** Leaderboard can show "pending" scores for entries with no assigned judge; judge assignment is a prerequisite to any score existing.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Athlete onboarding (name capture on first login) — gates the recorder
- [ ] Discipline + weight setup screen before recording
- [ ] Canvas-based recorder with overlay (timer, name, discipline, weight, serial, KOVA branding) at 30fps
- [ ] Countdown (configurable 5–60s) + minute beep + auto-stop at 10:10
- [ ] Playback review screen before export
- [ ] WebM export with slugified filename including serial
- [ ] YouTube instructions screen with pre-filled description + copy button
- [ ] Competition creation (organizer): name, date, disciplines, weight+gender divisions
- [ ] Athlete self-registration + YouTube URL submission for an entry
- [ ] Organizer: manually add athlete entries
- [ ] Organizer: assign judges to entries
- [ ] Judge interface: YouTube-embedded video + tap counter + submit score
- [ ] Live leaderboard (unofficial) segmented by division
- [ ] Official results publication by organizer

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Age divisions (Junior/Open/Masters/Veterans) — add when organizers request segmentation beyond gender + weight class
- [ ] Multi-judge per entry with head judge override — add when a competition has enough volume that single-judge accuracy becomes a concern
- [ ] Push notifications (score submitted, results published, entry assigned) — add when users complain about having to check manually
- [ ] PWA offline mode for judge interface — add if judges report connectivity issues during judging sessions

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Athlete competition history / profile page — defer until there are enough competitions to make history meaningful
- [ ] Organizer analytics (rep distributions, submission rates, judge turnaround time) — defer until competitions are running
- [ ] Biathlon scoring (Jerk + Snatch combined, coefficient-based) — defer; adds coefficient calculation complexity; validate single-discipline first
- [ ] Public leaderboard embeds (website snippet) — Competition Corner offers this; useful for federation websites; defer until organizers ask for it
- [ ] Age category / masters divisions — defer; only needed for larger competitions with demographic spread
- [ ] Body weight verification workflow — defer; current v1 handles this via video instructions checklist

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Canvas overlay recorder | HIGH | HIGH | P1 |
| YouTube instructions + export | HIGH | LOW | P1 |
| Competition creation (organizer) | HIGH | LOW | P1 |
| Athlete registration + URL submission | HIGH | LOW | P1 |
| Judge interface (tap counter + video) | HIGH | MEDIUM | P1 |
| Live leaderboard (unofficial → official) | HIGH | MEDIUM | P1 |
| Athlete onboarding | HIGH | LOW | P1 |
| Judge assignment by organizer | HIGH | LOW | P1 |
| PWA installability (manifest + service worker) | MEDIUM | LOW | P2 |
| Age divisions | MEDIUM | MEDIUM | P2 |
| Push notifications | MEDIUM | MEDIUM | P2 |
| Multi-judge per entry | HIGH | HIGH | P2 |
| Offline judge interface | MEDIUM | HIGH | P2 |
| Athlete competition history | LOW | MEDIUM | P3 |
| Biathlon / coefficient scoring | MEDIUM | MEDIUM | P3 |
| Organizer analytics | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | CrossFit Games / Competition Corner | KB World League / IKMF | AKLU Timer App | Kova (our approach) |
|---------|--------------------------------------|------------------------|----------------|---------------------|
| Video submission format | YouTube URL only (mandatory) | YouTube / Vimeo / Dropbox email submission | N/A (timing hardware) | YouTube URL (mandatory); in-app recording is Kova's differentiator |
| Timer visible in video | Athlete responsibility; stated as requirement | Athlete must show "wall clock, phone, or other device" | External hardware timer | Baked into canvas overlay; no athlete setup required |
| Athlete identification in video | Athlete states name in front of camera | Athlete introduces themselves verbally | N/A | Name baked into overlay every frame; no verbal introduction needed |
| Weight verification | Shown on loaded barbell / equipment | Body weight on scale + kettlebell on scale shown in video | N/A | Video instructions checklist (v1); in-frame via overlay (weight field) |
| Judge interface | Crowdsource voting (CrossFit) or qualified judge review | Senior judge committee review | Rep counter + timer for judges | Assigned judge, embedded YouTube + tap counter |
| Rep counting mechanism | CrossFit: vote "good / needs review / invalid"; no rep count | Judge counts manually | Hardware tap counter for in-person judges | Tap counter with live count display alongside embedded video |
| Leaderboard divisions | Division, age group, region, Rx/scaled | Weight class, gender, kettlebell weight | N/A | Division (gender + bodyweight class), kettlebell weight |
| Live vs official results | Live: visible; Official: published after review period | Results published by committee after validation | N/A | Unofficial until organizer publishes; same pattern |
| PWA / mobile | Competition Corner is mobile-optimized web; no PWA manifest | Email-based submission; no digital platform | Native Android app | PWA; installable; mobile-first recorder and judge UI |
| Fraud prevention / authentication | Video review + community flagging | Honor system + date/time verification | N/A | Canvas overlay with serial number; serial links to DB record |

---

## Kettlebell Sport Conventions (Domain-Specific Requirements)

These are not general platform features but KB-sport-specific knowledge that must be baked into the product:

### Disciplines
- **Long Cycle**: Clean + jerk with one or two kettlebells; each rep = clean from hang + jerk overhead
- **Jerk**: Two kettlebells cleaned once to rack; repeated jerks overhead; hands do not leave bells
- **Snatch**: Single kettlebell; ballistic snatch from below hip to overhead; one hand switch permitted per set

### Set Structure
- Duration: exactly **10 minutes** (all major federations)
- No set-down: for Jerk and Long Cycle, the bells must not touch the ground; setting down = end of set (some organizations allow one set-down)
- Reps counted: only successful reps (clean lockout at top for all disciplines)

### Weight Classes (WKSF standard — MEDIUM confidence, varies by federation)
- **Men**: 58, 63, 68, 73, 78, 85, 95, 105, 105+ kg
- **Women**: 58, 63, 68, 68+ kg
- **Kettlebell weights (Men)**: 16, 20, 24, 28, 32 kg (Pro = 32 kg mandatory)
- **Kettlebell weights (Women)**: 8, 12, 16, 20, 24 kg (Pro = 24 kg mandatory)

### Age Categories (standard across WKSF, IKMF, IKFF)
- Junior: under 18 (or under 22 in some federations)
- Open: 18–39
- Masters: 40–49
- Veterans: 50+

### Scoring Context
- V1 score = rep count (integer)
- V2+ may need coefficient scoring: e.g., WKSF formula `reps × weight_coefficient` for ranking across weight classes (analogous to Wilks in powerlifting)
- Biathlon = Jerk reps + Snatch reps (same-day, same athlete)

### No-Rep Conventions
- For v1, the judge submits a rep count; any questioned reps are manually resolved by organizer
- In full federation rules, judges can call no-reps for: incomplete lockout, early descent, hand grip fault
- Kova v1 does not implement automated no-rep detection; human judgment only

---

## Sources

- [AKLU Kettlebell Platform Timer (Google Play)](https://play.google.com/store/apps/details?id=com.kbcounter&hl=en_US) — MEDIUM confidence
- [IKFF World Championship 2025 (virtual format)](https://ikff.com/products/2025-ikff-world-championship) — MEDIUM confidence
- [KB World League Video Submission Instructions](https://www.kettlebellworld.org/video-submission-instructions) — MEDIUM confidence (page did not fully render; IKO requirements extracted from search)
- [WKSF World Kettlebell Sport Federation](https://wksf.site/) — MEDIUM confidence
- [IKMF Ranks and Rules](https://www.ikmf-world.com/rules/ranks-and-rules/) — LOW confidence (403 on fetch; weight classes from search results)
- [CrossFit Video Submission Best Practices](https://games.crossfit.com/article/video-submission-best-practices) — HIGH confidence
- [How to Judge the In-Affiliate Semifinals Video Submissions](https://games.crossfit.com/article/how-judge-affiliate-semifinals-video-submissions) — HIGH confidence
- [Competition Corner Features](https://about.competitioncorner.net/features) — HIGH confidence
- [JudgeMate Features](https://www.judgemate.com/en) — HIGH confidence
- [KettleBoards](https://kettleboards.com/) — HIGH confidence
- [PWA iOS Limitations — MagicBell Guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — HIGH confidence
- [WebSearch: kettlebell sport weight classes / divisions] — MEDIUM confidence (multiple sources agree)
- [WebSearch: PWA push notifications, install prompts 2025] — HIGH confidence
- [WebSearch: CrossFit leaderboard division/filtering features] — HIGH confidence

---

*Feature research for: Kova — online asynchronous kettlebell sport competition PWA*
*Researched: 2026-03-24*
