# Supabase Setup Guide for GlassBox AI

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Click "Start your project"
3. Create a new project:
   - **Name**: glassbox-ai
   - **Database Password**: (choose a strong password and save it)
   - **Region**: Choose closest to you
4. Wait for project to be ready (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase dashboard, click on **Settings** (gear icon)
2. Click on **API** in the sidebar
3. Copy these values:
   - **Project URL** (looks like: https://xxxxxxxxxxxxx.supabase.co)
   - **anon public** key (starts with: eyJhbG...)

## Step 3: Set Up Environment Variables

Create a `.env.local` file in the `frontend` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Set Up Database Tables

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste this SQL:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Supabase auth handles this, but we'll add metadata)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'hr_manager',
  organization_id UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Decisions table
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_type TEXT NOT NULL,
  employee_data JSONB NOT NULL,
  comparable_cohort JSONB,
  status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT NOW(),
  finalized_at TIMESTAMP,
  organization_id UUID
);

-- Bias Analysis table
CREATE TABLE bias_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE UNIQUE,
  risk_score FLOAT,
  risk_level TEXT,
  detected_patterns JSONB,
  fairness_metrics JSONB,
  comparable_outcomes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Explanations table
CREATE TABLE explanations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE UNIQUE,
  justification TEXT NOT NULL,
  key_factors JSONB,
  alternatives JSONB,
  gemini_prompt TEXT,
  gemini_response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id),
  user_id UUID REFERENCES auth.users,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own decisions" ON decisions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create decisions" ON decisions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view related bias analysis" ON bias_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = bias_analysis.decision_id 
      AND decisions.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view related explanations" ON explanations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = explanations.decision_id 
      AND decisions.created_by = auth.uid()
    )
  );
```

4. Click **Run** to execute

## Step 5: Configure Backend to Use Supabase

Update `backend/.env`:

```bash
# Supabase PostgreSQL connection
DATABASE_URL=postgresql://postgres:[YOUR-DB-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Supabase API (for using Supabase client in Python)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Gemini API
GEMINI_API_KEY=your_gemini_key_here
```

## Step 6: Test Authentication

1. Restart your Next.js dev server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Navigate to http://localhost:3000/register
3. Create an account
4. You should be redirected to the dashboard!

## Step 7: Deploy Backend to Supabase Edge Functions (Optional)

If you want to deploy the FastAPI backend to Supabase:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

## Alternative: Deploy FastAPI Separately

You can also deploy FastAPI to:
- **Railway** (easiest, free tier)
- **Render** (free tier)
- **Fly.io** (free tier)
- **Google Cloud Run** (pay per use)

---

## Quick Start Commands

```bash
# Frontend (already installed Supabase)
cd frontend
npm run dev

# Backend (connect to Supabase PostgreSQL)
cd backend
# Make sure DATABASE_URL points to Supabase
python -m uvicorn app.main:app --reload
```

## What's Next?

1. ✅ Authentication works through Supabase
2. ✅ Database hosted on Supabase
3. 🔄 Frontend talks to Supabase directly for auth
4. 🔄 Backend can connect to same Supabase database
5. 🔄 Deploy both frontend (Vercel) and backend (Railway)

You now have a production-ready authentication system!
