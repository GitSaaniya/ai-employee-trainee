# SkillSim AI

AI-powered employee training and performance-readiness platform for enterprise L&D demonstrations.

SkillSim AI helps organisations define role competencies, run realistic workplace simulations, score employee decisions, deliver evidence-based feedback, generate improvement plans, and track readiness over repeated attempts.

## Main features

- Demo login for Administrator and Employee roles
- Role and competency modelling with weights and readiness matrix
- Multi-step simulation builder with Demo AI generation
- Assignment management and employee directory/profiles
- Immersive simulation player with consequences and final scoring
- Closed-loop improvement plans (AI-labelled, admin review)
- Analytics: workforce, team, employee comparison, competency gaps, simulation effectiveness
- Integrations catalogue (visual only)
- Demo Mode guided walkthrough

## Architecture

- **Next.js App Router** + TypeScript + Tailwind CSS
- **Client mock data layer** (`lib/data/store.ts`) seeded from `lib/data/seed.ts`, persisted in `localStorage`
- **Demo auth** via HTTP-only cookie + local session for UI
- **Scoring / improvement** utilities in `lib/scoring` and `lib/improvement`
- **AI route** `POST /api/ai/generate-simulation` (OpenAI if `OPENAI_API_KEY` is set; otherwise deterministic Demo AI)

```
Role requirements → simulation → decisions → competency scoring → feedback → improvement plan → reassessment → progress
```

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local` for live AI (see `.env.example`):

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
GLADIA_API_KEY=
SARVAM_API_KEY=
SARVAM_SPEAKER=ritu
SARVAM_LANGUAGE=en-IN

# Optional legacy simulation builder
OPENAI_API_KEY=sk-...
```

Without API keys, **Demo AI / browser TTS / mock STT** still work.
Live interview stack when keys are set: **Silero VAD → Gladia STT → Groq → Sarvam TTS**.
Never commit API keys. Rotate any key that was pasted in chat.

Optional future Supabase (not required for MVP):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Never expose service-role secrets in client code.

## Demo credentials

| Account | Email | Access |
|---------|-------|--------|
| Admin | `admin@skillsim.ai` | Administrator dashboard |
| Employee | `manu.nair@knolskape.in` | Learner experience (Manu Nair, Branch Manager) |

Use **Continue as Admin** / **Continue as Employee** on the login page.

## Seed data

Seeded automatically on first load:

- 1 organisation (Meridian Financial Services)
- 2 admins, 12 employees
- 5 departments (incl. FMCG Sales), 6 roles (incl. FMCG Sales Associate)
- 3 simulations including **High-Value Customer Transaction Alert** (5 stages)
- **AI Assessment:** Mall Floor Shampoo Pitch (published) assigned to Jordan + Priya
- Assignments, attempts, feedback reports, improvement plans, integrations

Reset anytime from **Admin → Settings → Reset seeded data**.

## CHRO demo script (~10 minutes)

1. Login as Admin → enable **Demo Mode** (optional guide).
2. Open **Experience** → Mall Floor Shampoo Pitch (or Generate with Groq).
3. Confirm Deploy assignments.
4. Switch to Employee → **AI Assessment** → allow camera/mic → complete interview.
5. Employee sees summary Capability Card.
6. Admin → assessment **Analytics**: heatmap, evidence, **What to deploy next**.
7. Optional: open linked simulation / templates from deploy-next.

## AI integration behaviour

1. Builder **Generate with AI** calls `/api/ai/generate-simulation`
2. Input validated with Zod
3. If `OPENAI_API_KEY` exists, server calls OpenAI and validates structured output
4. Otherwise returns deterministic mock output labelled **Demo AI generation**
5. API keys are never sent to the browser

## Database model

See [`supabase/schema.sql`](supabase/schema.sql) for a reference relational schema and RLS notes. The running MVP uses the TypeScript model in `lib/types.ts` and local store — Supabase is not required.

## Security considerations

- Role-based route protection via middleware + client shell checks
- AI recommendations labelled; admin review before plan activation
- Audit-friendly `createdAt` / `updatedAt` timestamps
- Employee comparison disclaimer on analytics
- No protected-trait scoring; no automated employment decisions

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
```

## Known MVP limitations

- Data is local/mock (not multi-user realtime)
- Integrations are visual status cards only
- OpenAI path is optional; Demo AI is the default
- Voice, avatars, SCORM/xAPI, and mobile apps are out of scope

## Future roadmap

- Voice-based roleplay
- Avatar simulations
- Live manager coaching
- SCORM/xAPI support
- Real HRIS and LMS integrations
- Multilingual simulations
- Custom competency libraries
- Organisation-level benchmarking
- Scenario versioning and approval workflows
- Bias testing and AI governance
- Mobile application

## License

Private demo MVP.
