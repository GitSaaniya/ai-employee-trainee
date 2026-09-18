# KNOLSKAPE AI Assessment — Detailed Implementation Plan

**Product:** SkillSim AI / GenieKreator Experience layer  
**Feature:** KNOLSKAPE AI Assessment (video interview)  
**Reference UI:** [GenieKreator](https://www.knolskape.com/genie-kreator) + provided product screenshots  
**Component system:** Existing [shadcn/ui](https://ui.shadcn.com/) primitives in `components/ui`, extended for Genie dark Experience shell  

---

## 1. Locked decisions (from quiz)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Delivery | **Phased sequential** — mock UI → authoring/analytics → Groq scoring → live Gladia→Groq→Sarvam + **Silero VAD / Smart Turn / barge-in** |
| 2 | APIs | **Groq + Gladia + Sarvam** (all available) |
| 3 | Questions | **Hybrid** — fixed core questions + adaptive follow-ups |
| 4 | Video | **Live camera preview only** — audio is the scored signal (no session video recording in MVP) |
| 5 | Language | **English only** |
| 6 | Seed demo | **FMCG sales / mall shampoo** as primary scenario |
| 7 | UI scope | **New Experience shell** + light touch elsewhere; Genie look + shadcn components |
| 8 | Admin | **Single Admin** role (CHRO/CEO demo via same login) |
| 9 | Length | **~5 min / ~5 core questions** |
| 10 | Results | **Employee: summary**; **Admin: full evidence + rubric** (best for CHRO demo) |
| 11 | Turn-taking | **Silero VAD** + **Smart Turn** (end-of-utterance) + **min volume** gate + **barge-in** |

### Security note
API keys (`GROQ_API_KEY`, `GLADIA_API_KEY`, `SARVAM_API_KEY`) live only in `.env.local`. Never commit keys. Rotate any key that was pasted in chat.

---

## 2. Product positioning (4E)

GenieKreator’s [4E framework](https://www.knolskape.com/genie-kreator): **Evaluate → Educate → Experience → Enable**.

This feature is the **Experience** pillar:

- Admin authors an AI Assessment (role + metadata + training focus).
- Employee runs a short live video interview with an AI interviewer.
- Every session produces readiness signals → Skills Intelligence for CHRO/CEO.
- Gaps inform what to train next (handoff toward Enable later).

**Primary demo narrative**

> CHRO assigns FMCG Sales Associates an AI Assessment: *pitch shampoo in a mall to a busy shopper*. Employee completes a ~5 minute camera+mic interview. Admin sees objection handling, discovery, closing scores with evidence; employee sees a clear summary and next focus.

---

## 3. Personas & jobs-to-be-done

### Admin (CHRO / CEO — one Admin role)
- Decide **what** employees are assessed and trained on.
- Configure role, metadata, scenario, competencies, AI persona.
- Assign cohorts / individuals.
- View **individual + cohort** analytics with evidence.
- Act on gaps (recommend training — soft link in MVP).

### Employee (learner)
- See assigned AI Assessment with context (role, scenario).
- Grant camera + microphone.
- Complete hybrid interview (~5 core Qs + adaptive follow-ups).
- View **summary scores** (not full admin evidence dump).

---

## 4. Information architecture & routes

### New / updated routes

```
/experience                         → 4E hub (Experience active) + entry cards
/admin/experience                   → Experience home (Start from Scratch / Templates)
/admin/assessments                  → List assessments
/admin/assessments/new              → Authoring wizard (Create → Refine → Generate → Deploy)
/admin/assessments/[id]             → Detail, assign, publish
/admin/assessments/[id]/analytics    → Capability + cohort for this assessment
/admin/employees/[id]               → Light touch: link to assessment results
/admin/analytics                    → Light touch: “AI Assessment” section

/employee/assessments               → My assessments
/employee/assessments/[assignmentId]           → Intro (brief + interviewer + Start)
/employee/assessments/[assignmentId]/interview → Live session (cam preview + voice loop)
/employee/assessments/[assignmentId]/results   → Employee summary card
```

### Navigation
- Admin shell: add **Experience** (4E pill or nav item).
- Employee shell: add **AI Assessment**.
- Keep existing simulation flows; do not break SkillSim demo paths.

---

## 5. UI / design system

### Visual language (GenieKreator-aligned)
- Background: deep navy / near-black (`#0B0E14` family), subtle nebula/gradient.
- Accents: teal/cyan for active states, CTAs, progress.
- Type: serif for major step titles (Create / Refine / Generate / Deploy); sans for UI (existing app fonts + optional display font for Experience shell only).
- Cards: dark translucent panels, recommended = glowing teal border.
- Primary buttons: blue→cyan gradient with soft glow on loading (“Generating…”).

### Component approach ([shadcn/ui](https://ui.shadcn.com/))
- Reuse: `Button`, `Card`, `Badge`, `Input`, `Tabs`, `Progress`, `Avatar`, `Dialog`, `Select`.
- Add as needed: `Textarea`, `Slider`, `Table`, `Sheet`, `Skeleton`, `Alert`.
- Build Experience-specific composites:
  - `FourEPillNav`
  - `ExperienceChoiceCards` (Scratch / Template)
  - `AuthoringStepper` (4 steps + sub-steps)
  - `CapabilityCard`
  - `InterviewStage` (cam + transcript + status + mic meter)
  - `GenieLoading` (spinner + progress + status copy)

### Scope of restyle
- **Full Genie treatment:** Experience + Assessment routes.
- **Light touch:** shared nav labels, admin analytics entry, employee home card pointing to assessments.
- Do **not** rewrite entire SkillSim UI in phase 1–2.

---

## 6. Domain model

### Entities (extend `lib/types.ts` + store)

```ts
AssessmentStatus = "draft" | "generating" | "ready" | "published" | "archived"
AssignmentStatus = "assigned" | "in_progress" | "completed" | "expired"
TurnRole = "ai" | "user" | "system"

Assessment {
  id, title, status
  domain            // e.g. "FMCG Sales"
  roleId | roleLabel
  audienceMetadata  // region, level, product focus, location type
  goal              // "Sell shampoo in malls to walk-in shoppers"
  persona           // interviewer name, style, voice notes
  durationMinutes   // default 5
  coreQuestions[]   // fixed bank (target 5)
  rubricSkills[]    // { id, name, weight, descriptors }
  adaptiveEnabled   // true
  createdAt, updatedAt
}

AssessmentAssignment {
  id, assessmentId, employeeId
  status, dueAt, assignedAt, completedAt
}

AssessmentSession {
  id, assignmentId
  startedAt, endedAt
  permissionGranted { camera, microphone }
  turns[]           // { role, text, at, followUp?: boolean }
  status            // "active" | "completed" | "aborted"
}

AssessmentResult {
  id, sessionId, assignmentId, employeeId, assessmentId
  overallScore      // 0–100
  skillScores[]     // { skillId, score, evidence[] }
  employeeSummary   // short, motivational, non-sensitive
  adminReport       // full rubric, quotes, coaching notes
  scoredAt, scoredBy // "groq" | "demo"
}
```

### Seed (Phase 0/1)
- Org context can stay Meridian or be dual-labeled; **primary Experience demo** is FMCG.
- Example assessment: **Mall Floor Shampoo Pitch**.
- Skills: Objection handling, Discovery questioning, Product knowledge, Closing & next steps (Capability Card style).
- 1–2 employees assigned for demo login.

---

## 7. Voice & AI architecture

### Audio stack (locked)

| Layer | Tech | Role |
|-------|------|------|
| Capture | Browser `MediaStream` + `AudioWorklet` / ScriptProcessor | Mic PCM + cam preview |
| Min volume | RMS / LUFS-style gate (client) | Ignore noise below threshold before VAD counts as speech |
| VAD | **Silero VAD** (ONNX in browser or local WASM/worker) | Detect speech vs silence in realtime |
| End of turn | **Silero Smart Turn** (end-of-utterance model) | Decide when the user has *finished* speaking (smarter than fixed silence timeout alone) |
| STT | **Gladia** | Speech → text after turn commit |
| LLM | **Groq** | Next question / adaptive follow-up / scoring |
| TTS | **Sarvam** | AI interviewer voice |
| Barge-in | Silero VAD + min volume while TTS plays | User can interrupt AI mid-sentence |

Smart Turn complements VAD: VAD says “speech is happening”; Smart Turn says “this utterance is complete — commit the turn.”

### Runtime pipeline (Phase 4)

```
MediaStream (mic + cam preview)
  → PCM frames
  → Min-volume gate ──(below threshold)──► ignore / stay idle
  → Silero VAD ──(speech start)──► start utterance buffer
                    ──(speech continue)──► keep buffering (+ optional streaming STT later)
  → Silero Smart Turn ──(end of utterance)──► COMMIT TURN
  → POST /api/assessment/stt (Gladia) on committed audio
  → Transcript turn saved
  → POST /api/assessment/turn (Groq)
        • evaluates last answer vs rubric
        • adaptive follow-up OR next core question OR close
  → POST /api/assessment/tts (Sarvam)
  → Play AI audio ── while playing, keep VAD armed for BARGE-IN
  → Update transcript / progress (Q 2/5 …)
```

### Barge-in behavior

While AI TTS is playing (`speaking` state):

1. Min-volume gate must pass (avoids false barges from room noise / TTS bleed).
2. Silero VAD detects sustained user speech (debounce ~150–300 ms).
3. **Interrupt:** stop TTS playback immediately; discard remaining audio queue; abort in-flight TTS fetch if any.
4. Enter `listening` / buffering; do **not** wait for AI sentence to finish.
5. On Smart Turn commit → STT → Groq (treat as user turn; cancel unfinished AI text if needed).
6. UI: status chip flips to “Listening…”; optional flash on mic meter.

**Echo control (MVP):** Prefer headphones in UI copy; apply higher min-volume / VAD aggressiveness during TTS; optional soft AEC later. Do not require full-duplex acoustic echo cancellation for v1.

### Session state machine

```
idle
 → requesting_permissions
 → ready
 → speaking          // AI TTS playing (barge-in armed)
 → listening         // user speech after VAD start (or post–barge-in)
 → turn_pending      // Smart Turn not yet committed
 → transcribing      // Gladia on committed utterance
 → thinking          // Groq
 → speaking | complete | error
```

Also: `interrupted` transient when barge-in fires (then → `listening`).

### Tunables (config + admin defaults later)

| Param | Purpose | Suggested MVP default |
|-------|---------|------------------------|
| `minVolumeDb` | Floor before speech counts | ~-45 to -35 dBFS (calibrate in demo room) |
| `vadSpeechThreshold` | Silero speech probability cut | library default, tweak in Phase 4 |
| `smartTurnConfidence` | End-of-utterance commit threshold | library default |
| `minSpeechMs` | Ignore blips shorter than this | 250–400 ms |
| `maxUtteranceMs` | Force commit if user never pauses | 20–30 s |
| `bargeInDebounceMs` | Sustained speech before interrupt | 200 ms |
| `bargeInMinVolumeDb` | Stricter floor during TTS | slightly higher than idle |

Expose a small **Interview audio debug** panel in dev (meters + VAD flag + last Smart Turn event) — hide in production demo.

### MVP constraints
- Conversational turns with **VAD + Smart Turn + barge-in** (not push-to-talk only).
- Push-to-talk / “I’m done” remains as **fallback** if Silero fails to load.
- Camera: **preview only**; do not upload or store video.
- English only.
- ~5 core questions; adaptive follow-ups capped (e.g. max 2 per core Q or max +3 total) to keep ~5 minutes.
- No storing of raw audio beyond the live session buffer (discard after STT unless debugging flag).

### Hybrid question logic
1. Ask core question N (TTS).
2. User answers; Smart Turn commits → Gladia → Groq classifies: `sufficient | shallow | off_topic`.
3. If shallow/off_topic → one adaptive follow-up, then move on.
4. After core set → closing + score.
5. Barge-in mid-question: treat committed speech as the answer (or as “user interrupted — acknowledge briefly and re-ask once” if audio was too short / `< minSpeechMs`).

On session complete:

```
Full transcript + rubric → POST /api/assessment/score (Groq)
  → AssessmentResult { employeeSummary, adminReport, skillScores }
```

### API routes (server-only keys)

| Route | Purpose |
|-------|---------|
| `POST /api/assessment/generate` | Groq authors questions/rubric/persona from admin brief |
| `POST /api/assessment/stt` | Proxy Gladia |
| `POST /api/assessment/tts` | Proxy Sarvam |
| `POST /api/assessment/turn` | Groq next interviewer move |
| `POST /api/assessment/score` | Groq final scoring + dual reports |

**Client-local (no API key):** Silero VAD + Smart Turn models (ONNX/WASM assets under `public/models/` or npm package).

Fallback: if keys missing, **Demo AI** deterministic responses (same pattern as existing simulation generate). If Silero assets fail, fall back to silence-timeout turn commit + optional push-to-talk.

### Env

```env
GROQ_API_KEY=
GLADIA_API_KEY=
SARVAM_API_KEY=
# optional model overrides
GROQ_MODEL=llama-3.3-70b-versatile

# client audio tunables (optional; can also live in code config)
NEXT_PUBLIC_MIN_VOLUME_DB=-40
NEXT_PUBLIC_BARGE_IN_DEBOUNCE_MS=200
```

---

## 8. Results & analytics (CHRO demo)

### Employee results (summary)
- Overall readiness %
- Top 2 strengths / top 2 focus areas (no long evidence quotes)
- Short AI coach note
- CTA: “Practice again” / link to related training (placeholder OK)

### Admin results (full)
- Learner Capability Card (skill bars + %)
- Evidence snippets per skill (transcript quotes)
- Session metadata (duration, Q count, adaptive count)
- Cohort heatmap when ≥2 completions

### Analytics views
1. Individual report  
2. Cohort analytics (by role / assessment)  
3. Actionable gaps → “suggested next experience” (static recommendation in MVP)

---

## 9. Phased delivery (sequential)

Implement **one phase at a time**. Each phase is shippable for a demo.

---

### Phase 0 — Foundation & Experience shell ✅ (implemented)
**Goal:** Genie-style Experience entry without live AI.

**Work**
- Design tokens / CSS variables for Experience theme.
- `FourEPillNav` (Experience active).
- Experience home: Start from Scratch / Use a Template cards.
- Template grid including **Mall Floor Shampoo Pitch**.
- Routes wired; empty/placeholder content OK.
- Light nav updates (admin + employee).

**Exit criteria**
- User can navigate Admin → Experience → see Genie-like cards matching screenshots.
- shadcn components used consistently.

**Shipped routes:** `/admin/experience`, `/admin/experience/templates`, `/admin/assessments/new`, `/employee/assessments`

**Estimate:** 1–2 days

---

### Phase 1 — Admin authoring + assignment + seed ✅ (implemented)
**Goal:** CHRO can define “train sales people to sell shampoo in malls” and assign employees.

**Work**
- Assessment CRUD in local store (`lib/data`).
- Wizard: Create → Refine → Generate → Deploy (Generate = **mock** for now).
- Refine sub-steps: goals, persona, scenario (Genie form patterns).
- Publish + assign to employees by role/filter.
- FMCG seed assessment + assignments for demo employee.
- Admin list/detail pages.

**Exit criteria**
- Admin creates/edits assessment metadata, publishes, assigns.
- Employee sees assignment in list (detail still stub).

**Shipped:** `/admin/assessments`, `/admin/assessments/new`, `/admin/assessments/[id]`, seed `assess_mall_shampoo` assigned to Jordan + Priya

**Estimate:** 2–3 days

---

### Phase 2 — Learner interview UI + mock transcript ✅ (implemented)
**Goal:** Full UX rehearsal with camera/mic permissions and fake conversation.

**Work**
- Intro screen (two-column: brief + interviewer persona).
- Request `getUserMedia({ video, audio })`; handle deny gracefully.
- Interview UI: self cam preview, status chip, progress (Q x/5), transcript panel, **mic level meter**.
- Mock audio controller that mirrors production states: `listening | turn_pending | thinking | speaking | interrupted`.
- Mock turn commit via **silence timer** (stand-in for Smart Turn) + optional “I’m done speaking” fallback button.
- Mock barge-in: while fake TTS/audio plays, loud mic input or spacebar → interrupt → new user turn.
- Mock completion → placeholder results (hardcoded skill %).
- No Gladia/Sarvam/Groq/Silero weights required yet.

**Exit criteria**
- End-to-end demo path without API keys.
- Permissions + turn/barge-in UI states feel production-like.

**Shipped routes:** `/employee/assessments/[id]`, `.../interview`, `.../results`, `/admin/assessments/[id]/analytics`

**Estimate:** 2–3 days

---

### Phase 3 — Real Groq generation + scoring ✅ (implemented)
**Goal:** Real LLM for authoring and dual reports; still mock or typed voice.

**Work**
- Wire `POST /api/assessment/generate` (questions, persona, rubric from brief).
- Wire `POST /api/assessment/turn` (hybrid core + adaptive).
- Wire `POST /api/assessment/score` → `employeeSummary` + `adminReport` + skill scores.
- Replace mock results with Groq output; persist in store.
- Admin Capability Card + employee summary pages (real data).
- Cohort strip on analytics when multiple results exist.

**Exit criteria**
- Typing or mock STT still works, but questions/scoring are live Groq.
- CHRO demo: assign FMCG → employee completes → admin sees evidence, employee sees summary.

**Shipped:** `/api/assessment/{generate,turn,score}`, wizard + interview wired, cohort analytics, `.env.example`

**Estimate:** 2–3 days

---

### Phase 4 — Live voice + Silero turn-taking ✅ (implemented)
**Goal:** Full live cam + mic AI interview with VAD, Smart Turn, min volume, and barge-in.

**Work — A: Gladia STT + Sarvam TTS**
- Browser audio capture → Gladia STT on committed utterances.
- Groq turn response → Sarvam TTS → playback queue.
- Time-box session (~5 min) and adaptive caps.
- Loading/error toasts; retry on TTS/STT failure.
- Keep camera preview-only (no video upload).

**Work — B: Silero VAD + Smart Turn + min volume**
- Load Silero VAD (+ Smart Turn) ONNX/WASM in a Web Worker.
- Min-volume gate before VAD speech start.
- Smart Turn commits end-of-utterance → flush buffer → STT.
- Tunables via config (`minVolumeDb`, debounce, max utterance).
- Dev-only audio debug panel (RMS, VAD flag, turn events).
- Fallback: silence-timeout + push-to-talk if models fail to load.

**Work — C: Barge-in**
- Arm VAD during `speaking`; on sustained speech above `bargeInMinVolumeDb`, stop TTS and switch to `listening`.
- Cancel queued TTS; handle short barge as re-ask vs valid answer.
- Headphones tip in UI; tune thresholds to reduce echo false positives.

**Exit criteria**
- Full stack: Silero (VAD + Smart Turn) → Gladia → Groq → Sarvam.
- Barge-in interrupts AI mid-sentence reliably in a quiet demo room.
- Stable demo for ~5 core questions + limited follow-ups.

**Shipped:** `/api/assessment/stt`, `/api/assessment/tts`, `@ricky0123/vad-web` Silero, tts player, Alt+D debug panel

**Estimate:** 4–5 days

---

### Phase 5 — Polish, analytics depth, demo hardening ✅ (implemented)
**Goal:** Board-ready CHRO walkthrough.

**Work**
- Cohort heatmaps, gap “what to deploy next”.
- Empty/loading/error polish; Demo Mode steps for AI Assessment.
- Accessibility: focus, captions for TTS optional.
- README + env docs; seed reset includes assessments.
- Calibrate default `minVolumeDb` / barge-in for laptop demo mics.
- Optional: soft link from gaps → existing training/simulations.

**Exit criteria**
- 10-minute CHRO demo script works cold.
- No key leakage; graceful Demo AI if keys absent.

**Shipped:** heatmap + deploy-next, Demo Mode 4E path, captions toggle, calibrated audio defaults, README CHRO script

**Estimate:** 1–2 days

---

## 10. Phase dependency diagram

```
Phase 0  Experience shell + IA
   ↓
Phase 1  Admin authoring + FMCG seed + assignments
   ↓
Phase 2  Learner UI + permissions + mock interview
         (mock silence-turn + mock barge-in + mic meter)
   ↓
Phase 3  Groq generate / turn / score (real intelligence)
   ↓
Phase 4  Gladia + Sarvam + Silero VAD / Smart Turn / min volume / barge-in
   ↓
Phase 5  Analytics polish + audio calibration + demo hardening
```

Phases 3 and 4 must not start until Phase 2 UX (including interrupt UX) is signed off.

---

## 11. Suggested CHRO demo script (post Phase 3+)

1. Login as Admin → Experience → open **Mall Floor Shampoo Pitch**.  
2. Show Refine fields (goal, learner role, persona).  
3. Show Generate (rubric + 5 core questions).  
4. Deploy / assign to demo employee.  
5. Switch to Employee → Start Assessment → allow cam/mic.  
6. Complete short interview (mock voice until Phase 4; live after).  
7. Employee results: summary only.  
8. Admin → Capability Card + evidence quotes + cohort view.  
9. Point to “actionable gap” → next training recommendation.

---

## 12. Non-goals (MVP)

- Full acoustic echo cancellation / hardware AEC (headphones + thresholds first).
- Streaming partial STT captions before turn commit (optional later).
- Storing/recording interview video or long-term raw audio.
- Multi-language (Sarvam multilingual later).
- Separate CHRO vs CEO permission models.
- Full LMS/SCORM export (Deploy UI can show “Web link” as primary; SCORM as coming soon).
- Replacing existing simulation product.

---

## 13. File / module map (implementation guide)

```
app/
  experience/page.tsx
  admin/experience/page.tsx
  admin/assessments/...
  employee/assessments/...
  api/assessment/{generate,stt,tts,turn,score}/route.ts

components/
  experience/
    four-e-pill-nav.tsx
    choice-cards.tsx
    authoring-stepper.tsx
    capability-card.tsx
    interview-stage.tsx
    mic-meter.tsx
    audio-debug-panel.tsx   // dev only
    genie-loading.tsx

lib/
  assessment/
    types.ts
    mock-engine.ts          // Phase 2
    prompts.ts
    hybrid-flow.ts          // core + adaptive state machine
  audio/
    min-volume.ts           // RMS gate
    silero-vad.ts           // worker wrapper
    smart-turn.ts           // end-of-utterance
    barge-in.ts             // interrupt TTS on speech
    session-machine.ts      // listening/speaking/interrupted/...
    tts-player.ts           // queue + stop-on-barge
  data/
    seed.ts
    store.ts

public/
  models/                   // Silero VAD / Smart Turn ONNX (or CDN-cached)
```

---

## 14. Testing checklist (per phase)

| Phase | Must verify |
|-------|-------------|
| 0 | Routes render; 4E active state; mobile layout OK |
| 1 | Create/assign/persist after refresh (localStorage) |
| 2 | Permission deny; mock turn commit; **mock barge-in**; both result views |
| 3 | Groq generate/score with key; Demo AI without key |
| 4 | STT/TTS round-trip; **Silero VAD**; **Smart Turn commit**; **min volume** ignores noise; **barge-in** stops TTS; fallback if models fail |
| 5 | Full CHRO script under 10 minutes; thresholds stable on demo laptop |

---

## 15. Open items deferred (do not block Phase 0)

- Exact Groq / Gladia / Sarvam model IDs and pricing caps.  
- Exact Silero package vs self-hosted ONNX (browser worker vs tiny local sidecar) — decide at Phase 4 kickoff.  
- Whether Adaptive follow-ups are voice-only or also shown as text (recommend **both**).  
- Avatar image for AI interviewer (static photo like “Namita” pattern).  
- Supabase persistence (keep local store until Phase 5+ if needed).  
- Optional streaming STT for live captions before Smart Turn commit.

---

## 16. Immediate next step

**All phases 0–5 are implemented.** Run the CHRO demo script in the README; tune `.env.local` keys for live Groq / Gladia / Sarvam.
