# GlassBox AI — HR Bonus & Promotion Decision Support Tool

A full-stack app that helps managers and HR make more consistent bonus and promotion decisions. It calculates a suggested score from manager ratings, peer reviews, and KPI data, then flags cases where a manager's actual decision diverges significantly from that suggestion, so outliers get a second look.

This is a decision-support tool, not an automated decision-maker — it surfaces numbers and flags anomalies; a human still makes the final call.

## What it does

### Bonus calculation
- Combines manager ratings (40%), peer reviews (30%), and KPI data (30%) into a weighted score
- Adjusts for project complexity/impact and task-level weighting
- Normalizes scores across departments to correct for managers who rate everyone too leniently or harshly

### Promotion tracking (9-box grid)
- Places employees on a Performance vs. Potential grid using historical data
- Enforces basic eligibility rules (tenure, minimum performance) before someone is considered
- Flags "high performance / low potential" combinations for review — this pattern is a heuristic sometimes associated with reviewer bias, not proof of it
- Produces a 0–100 promotion-readiness score

### Audit trail
- Compares each manager's actual decision to the model's suggested score
- Flags decisions that deviate more than 20% from the suggestion
- Requires a written justification when a decision is flagged
- Logs decisions and overrides for later review

### Org structure
- Graph-based org chart for reporting lines
- Auto-reassigns reports when a manager changes role or leaves
- Tracks role/salary history over time (slowly-changing-dimension style)

## Tech stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: PostgreSQL via Supabase, with Row Level Security policies so managers only see their own team's data and HR sees everything
- **Backend logic**: Supabase Edge Functions for calculations, database triggers for integrity constraints, SQL views for analytics
- **Access control**: RBAC layered on top of RLS

## Status
A self-contained project — built and tested locally, not currently deployed with real company data. The RLS policies and audit logging are implemented and working, but haven't been through a real security review or production load.

## Getting started

### Prerequisites
- Node.js 18+
- Supabase CLI

### Installation
```bash
git clone https://github.com/your-org/glassbox-ai.git
cd frontend
npm install
npm run dev
```

### Database setup
Schema migrations and RLS policies live in `/supabase`. Run `supabase db reset` to apply all migrations.

## Deployment (Vercel)
1. Set **Root Directory** to `frontend` (Settings > General)
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
