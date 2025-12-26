-- GlassBox AI Database Schema for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/yxjsgfvqeiiltfheggnj/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users metadata table (auth.users is managed by Supabase)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'hr_manager',
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_type TEXT NOT NULL CHECK (decision_type IN ('hiring', 'promotion', 'appraisal', 'compensation', 'retention')),
  employee_data JSONB NOT NULL,
  comparable_cohort JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'reviewed', 'finalized')),
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finalized_at TIMESTAMP WITH TIME ZONE,
  organization_id UUID
);

-- Bias Analysis table
CREATE TABLE IF NOT EXISTS bias_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE UNIQUE,
  risk_score FLOAT CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high')),
  detected_patterns JSONB,
  fairness_metrics JSONB,
  comparable_outcomes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Explanations table
CREATE TABLE IF NOT EXISTS explanations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE UNIQUE,
  justification TEXT NOT NULL,
  key_factors JSONB,
  alternatives JSONB,
  gemini_prompt TEXT,
  gemini_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_decisions_created_by ON decisions(created_by);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bias_analysis_decision_id ON bias_analysis(decision_id);
CREATE INDEX IF NOT EXISTS idx_explanations_decision_id ON explanations(decision_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_decision_id ON audit_logs(decision_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can create decisions" ON decisions;
DROP POLICY IF EXISTS "Users can update own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can view related bias analysis" ON bias_analysis;
DROP POLICY IF EXISTS "System can insert bias analysis" ON bias_analysis;
DROP POLICY IF EXISTS "Users can view related explanations" ON explanations;
DROP POLICY IF EXISTS "System can insert explanations" ON explanations;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for decisions
CREATE POLICY "Users can view own decisions" ON decisions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create decisions" ON decisions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own decisions" ON decisions
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for bias_analysis
CREATE POLICY "Users can view related bias analysis" ON bias_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = bias_analysis.decision_id 
      AND decisions.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert bias analysis" ON bias_analysis
  FOR INSERT WITH CHECK (true);

-- RLS Policies for explanations
CREATE POLICY "Users can view related explanations" ON explanations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = explanations.decision_id 
      AND decisions.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert explanations" ON explanations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for audit_logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Create a function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ GlassBox AI database schema created successfully!';
  RAISE NOTICE 'Tables created: user_profiles, decisions, bias_analysis, explanations, audit_logs';
  RAISE NOTICE 'RLS policies enabled and configured';
  RAISE NOTICE 'Auto user profile creation trigger set up';
END $$;
