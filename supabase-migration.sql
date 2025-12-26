-- ====================================================================
-- GlassBox AI - Complete Supabase Database Schema
-- ====================================================================
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project (or create new one)
-- 3. Go to SQL Editor → New Query
-- 4. Paste this ENTIRE file
-- 5. Click RUN
-- ====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ====================================================================
-- TABLES
-- ====================================================================

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'hr_manager' CHECK (role IN ('hr_manager', 'admin', 'analyst')),
  organization_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Decisions table
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_type TEXT NOT NULL CHECK (decision_type IN ('hiring', 'promotion', 'appraisal', 'compensation', 'retention')),
  employee_data JSONB NOT NULL,
  comparable_cohort JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'reviewed', 'finalized')),
  created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finalized_at TIMESTAMP WITH TIME ZONE,
  organization_id UUID
);

-- Bias Analysis table
CREATE TABLE IF NOT EXISTS bias_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  risk_score FLOAT CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high')),
  detected_patterns JSONB DEFAULT '[]'::jsonb,
  fairness_metrics JSONB DEFAULT '{}'::jsonb,
  comparable_outcomes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Explanations table
CREATE TABLE IF NOT EXISTS explanations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE UNIQUE NOT NULL,
  justification TEXT NOT NULL,
  key_factors JSONB DEFAULT '[]'::jsonb,
  alternatives JSONB DEFAULT '[]'::jsonb,
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
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_decisions_created_by ON decisions(created_by);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_bias_analysis_decision_id ON bias_analysis(decision_id);
CREATE INDEX IF NOT EXISTS idx_explanations_decision_id ON explanations(decision_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_decision_id ON audit_logs(decision_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can create decisions" ON decisions;
DROP POLICY IF EXISTS "Users can update own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can delete own decisions" ON decisions;
DROP POLICY IF EXISTS "Users can view related bias analysis" ON bias_analysis;
DROP POLICY IF EXISTS "Service role can manage bias analysis" ON bias_analysis;
DROP POLICY IF EXISTS "Users can view related explanations" ON explanations;
DROP POLICY IF EXISTS "Service role can manage explanations" ON explanations;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;

-- User Profiles Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Decisions Policies
CREATE POLICY "Users can view own decisions" ON decisions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create decisions" ON decisions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own decisions" ON decisions
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own decisions" ON decisions
  FOR DELETE USING (auth.uid() = created_by);

-- Bias Analysis Policies
CREATE POLICY "Users can view related bias analysis" ON bias_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = bias_analysis.decision_id 
      AND decisions.created_by = auth.uid()
    )
  );

CREATE POLICY "Service role can manage bias analysis" ON bias_analysis
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Explanations Policies
CREATE POLICY "Users can view related explanations" ON explanations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM decisions 
      WHERE decisions.id = explanations.decision_id 
      AND decisions.created_by = auth.uid()
    )
  );

CREATE POLICY "Service role can manage explanations" ON explanations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Audit Logs Policies
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ====================================================================
-- DATABASE FUNCTIONS
-- ====================================================================

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'hr_manager')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard analytics
CREATE OR REPLACE FUNCTION public.get_dashboard_analytics(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_decisions', COUNT(*),
    'pending_decisions', COUNT(*) FILTER (WHERE status = 'pending'),
    'analyzed_decisions', COUNT(*) FILTER (WHERE status IN ('analyzed', 'reviewed', 'finalized')),
    'high_risk_decisions', (
      SELECT COUNT(*) 
      FROM bias_analysis ba
      JOIN decisions d ON d.id = ba.decision_id
      WHERE d.created_by = user_uuid AND ba.risk_level = 'high'
    ),
    'avg_risk_score', (
      SELECT COALESCE(AVG(risk_score), 0)
      FROM bias_analysis ba
      JOIN decisions d ON d.id = ba.decision_id
      WHERE d.created_by = user_uuid
    ),
    'decisions_by_type', (
      SELECT json_object_agg(decision_type, count)
      FROM (
        SELECT decision_type, COUNT(*) as count
        FROM decisions
        WHERE created_by = user_uuid
        GROUP BY decision_type
      ) sub
    )
  )
  INTO result
  FROM decisions
  WHERE created_by = user_uuid;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bias trends
CREATE OR REPLACE FUNCTION public.get_bias_trends(user_uuid UUID, days_back INT DEFAULT 30)
RETURNS TABLE(date DATE, avg_risk FLOAT, decision_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.created_at::DATE as date,
    AVG(ba.risk_score) as avg_risk,
    COUNT(DISTINCT d.id) as decision_count
  FROM decisions d
  LEFT JOIN bias_analysis ba ON ba.decision_id = d.id
  WHERE d.created_by = user_uuid
    AND d.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY d.created_at::DATE
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for updating user_profiles timestamp
DROP TRIGGER IF EXISTS on_user_profile_updated ON user_profiles;
CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- GRANT PERMISSIONS
-- ====================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ====================================================================
-- PROJECT-BASED PERFORMANCE EVALUATION SYSTEM (NEW)
-- ====================================================================

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop old constraint if exists (for migration from old schema)
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_check;

-- Employees table (enhanced org structure)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users, -- Null for employees without login access
  name TEXT NOT NULL,
  email TEXT,
  role_title TEXT NOT NULL, -- 'CEO', 'Engineering Manager', 'Senior Developer'
  department_id UUID REFERENCES departments,
  reports_to_id UUID REFERENCES employees(id), -- Null for CEO
  is_department_manager BOOLEAN DEFAULT FALSE, -- Is this person a department manager?
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  hire_date DATE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  termination_reason TEXT,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to existing employees table (for migration from old schema)
DO $$ 
BEGIN
  -- Add is_department_manager column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='employees' AND column_name='is_department_manager') THEN
    ALTER TABLE employees ADD COLUMN is_department_manager BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='employees' AND column_name='status') THEN
    ALTER TABLE employees ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated'));
  END IF;
  
  -- Add terminated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='employees' AND column_name='terminated_at') THEN
    ALTER TABLE employees ADD COLUMN terminated_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add termination_reason column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='employees' AND column_name='termination_reason') THEN
    ALTER TABLE employees ADD COLUMN termination_reason TEXT;
  END IF;
END $$;

-- Role History table (track all role/department changes)
CREATE TABLE IF NOT EXISTS role_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('hired', 'promoted', 'transferred', 'role_change', 'terminated', 'rehired')),
  old_role_title TEXT,
  new_role_title TEXT,
  old_department_id UUID REFERENCES departments,
  new_department_id UUID REFERENCES departments,
  old_reports_to_id UUID REFERENCES employees(id),
  new_reports_to_id UUID REFERENCES employees(id),
  was_manager BOOLEAN,
  is_manager BOOLEAN,
  reason TEXT,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments,
  weightage INTEGER NOT NULL CHECK (weightage >= 1 AND weightage <= 10),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress')),
  description TEXT,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks within projects
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  weightage INTEGER NOT NULL CHECK (weightage >= 1 AND weightage <= 10),
  assigned_to_id UUID REFERENCES employees(id),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'in_progress')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manager ratings (4 dimensions: Volume, Quality, Speed, Complexity)
CREATE TABLE IF NOT EXISTS manager_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  rated_by_id UUID REFERENCES employees(id) NOT NULL, -- The manager
  volume_score DECIMAL(3,2) NOT NULL CHECK (volume_score >= 0 AND volume_score <= 5),
  quality_score DECIMAL(3,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 5),
  speed_score DECIMAL(3,2) NOT NULL CHECK (speed_score >= 0 AND speed_score <= 5),
  complexity_score DECIMAL(3,2) NOT NULL CHECK (complexity_score >= 0 AND complexity_score <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, employee_id, rated_by_id)
);

-- Peer ratings (4 dimensions, only teammates on same project)
CREATE TABLE IF NOT EXISTS peer_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL, -- Who is being rated
  rated_by_id UUID REFERENCES employees(id) NOT NULL, -- Who is giving the rating
  volume_score DECIMAL(3,2) NOT NULL CHECK (volume_score >= 0 AND volume_score <= 5),
  quality_score DECIMAL(3,2) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 5),
  speed_score DECIMAL(3,2) NOT NULL CHECK (speed_score >= 0 AND speed_score <= 5),
  complexity_score DECIMAL(3,2) NOT NULL CHECK (complexity_score >= 0 AND complexity_score <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, employee_id, rated_by_id), -- Can't rate same person twice on same project
  CHECK (employee_id != rated_by_id) -- Can't rate yourself
);

-- Hard KPIs (department-specific metrics)
CREATE TABLE IF NOT EXISTS kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) NOT NULL,
  metric_category TEXT NOT NULL CHECK (metric_category IN ('Volume', 'Quality', 'Speed', 'Complexity')),
  metric_name TEXT NOT NULL, -- 'prs_merged', 'code_complexity', 'calls_made', etc.
  metric_value DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR NEW TABLES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_reports_to ON employees(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_employees_created_by ON employees(created_by);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_role_history_employee ON role_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_role_history_created_at ON role_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_dates ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_manager_ratings_project ON manager_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_manager_ratings_employee ON manager_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_peer_ratings_project ON peer_ratings(project_id);
CREATE INDEX IF NOT EXISTS idx_peer_ratings_employee ON peer_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpis_project ON kpis(project_id);
CREATE INDEX IF NOT EXISTS idx_kpis_employee ON kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_kpis_category ON kpis(metric_category);

-- ====================================================================
-- RLS POLICIES FOR NEW TABLES
-- ====================================================================

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpis ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running this script)
DROP POLICY IF EXISTS "All users can view departments" ON departments;
DROP POLICY IF EXISTS "HR can manage departments" ON departments;
DROP POLICY IF EXISTS "All users can view employees" ON employees;
DROP POLICY IF EXISTS "HR can manage employees" ON employees;
DROP POLICY IF EXISTS "All users can view role history" ON role_history;
DROP POLICY IF EXISTS "HR can manage role history" ON role_history;
DROP POLICY IF EXISTS "Users can view all projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can view all tasks" ON tasks;
DROP POLICY IF EXISTS "Users can manage tasks in own projects" ON tasks;
DROP POLICY IF EXISTS "Users can view all manager ratings" ON manager_ratings;
DROP POLICY IF EXISTS "Users can create manager ratings" ON manager_ratings;
DROP POLICY IF EXISTS "Users can view all peer ratings" ON peer_ratings;
DROP POLICY IF EXISTS "Users can create peer ratings" ON peer_ratings;
DROP POLICY IF EXISTS "Users can view all kpis" ON kpis;
DROP POLICY IF EXISTS "Users can manage kpis in own projects" ON kpis;

-- Departments: All authenticated users can view, only HR can create/update
CREATE POLICY "All users can view departments" ON departments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR can manage departments" ON departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('hr_manager', 'admin')
    )
  );

-- Employees: All authenticated users can view, only HR can manage
CREATE POLICY "All users can view employees" ON employees
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR can manage employees" ON employees
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('hr_manager', 'admin')
    )
  );

-- Role History: All users can view, only system/HR can insert
CREATE POLICY "All users can view role history" ON role_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "HR can manage role history" ON role_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('hr_manager', 'admin')
    )
  );

-- Projects: Users can view and create, update own projects
CREATE POLICY "Users can view all projects" ON projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = created_by);

-- Tasks: Users can view all, manage tasks in own projects
CREATE POLICY "Users can view all tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id
    )
  );

CREATE POLICY "Users can manage tasks in own projects" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Manager Ratings: Users can view all, create/update own ratings
CREATE POLICY "Users can view all manager ratings" ON manager_ratings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create manager ratings" ON manager_ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = manager_ratings.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Peer Ratings: Similar to manager ratings
CREATE POLICY "Users can view all peer ratings" ON peer_ratings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create peer ratings" ON peer_ratings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = peer_ratings.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- KPIs: Users can view all, manage in own projects
CREATE POLICY "Users can view all kpis" ON kpis
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage kpis in own projects" ON kpis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = kpis.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- ====================================================================
-- TRIGGERS FOR NEW TABLES
-- ====================================================================

DROP TRIGGER IF EXISTS on_department_updated ON departments;
CREATE TRIGGER on_department_updated
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_employee_updated ON employees;
CREATE TRIGGER on_employee_updated
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_project_updated ON projects;
CREATE TRIGGER on_project_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- ADVANCED FUNCTIONS FOR EMPLOYEE MANAGEMENT
-- ====================================================================

-- Function to handle manager promotion/demotion with auto-reassignment
CREATE OR REPLACE FUNCTION public.handle_manager_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If someone is being promoted to manager
  IF NEW.is_department_manager = TRUE AND (OLD.is_department_manager IS NULL OR OLD.is_department_manager = FALSE) THEN
    -- Check if there's already a manager in this department
    IF NEW.department_id IS NOT NULL THEN
      -- Demote existing manager (if any)
      UPDATE employees 
      SET is_department_manager = FALSE 
      WHERE department_id = NEW.department_id 
        AND is_department_manager = TRUE 
        AND id != NEW.id;
      
      -- Reassign all employees in this department to report to new manager
      UPDATE employees
      SET reports_to_id = NEW.id
      WHERE department_id = NEW.department_id
        AND id != NEW.id
        AND (reports_to_id IS NULL OR reports_to_id IN (
          SELECT id FROM employees WHERE department_id = NEW.department_id
        ));
    END IF;
  END IF;
  
  -- If someone is being demoted from manager
  IF NEW.is_department_manager = FALSE AND OLD.is_department_manager = TRUE THEN
    -- Set their direct reports to NULL (report to CEO)
    UPDATE employees
    SET reports_to_id = NULL
    WHERE reports_to_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically track role changes
CREATE OR REPLACE FUNCTION public.track_role_change()
RETURNS TRIGGER AS $$
DECLARE
  change_type_val TEXT;
BEGIN
  -- Determine change type
  IF TG_OP = 'INSERT' THEN
    change_type_val := 'hired';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'terminated' AND OLD.status != 'terminated' THEN
      change_type_val := 'terminated';
    ELSIF NEW.status = 'active' AND OLD.status = 'terminated' THEN
      change_type_val := 'rehired';
    ELSIF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      change_type_val := 'transferred';
    ELSIF NEW.is_department_manager IS DISTINCT FROM OLD.is_department_manager THEN
      change_type_val := 'promoted';
    ELSE
      change_type_val := 'role_change';
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  
  -- Insert into role_history
  INSERT INTO role_history (
    employee_id,
    change_type,
    old_role_title,
    new_role_title,
    old_department_id,
    new_department_id,
    old_reports_to_id,
    new_reports_to_id,
    was_manager,
    is_manager,
    reason,
    created_by
  ) VALUES (
    NEW.id,
    change_type_val,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.role_title ELSE NULL END,
    NEW.role_title,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.department_id ELSE NULL END,
    NEW.department_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.reports_to_id ELSE NULL END,
    NEW.reports_to_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.is_department_manager ELSE NULL END,
    NEW.is_department_manager,
    CASE WHEN change_type_val = 'terminated' THEN NEW.termination_reason ELSE NULL END,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get department manager
CREATE OR REPLACE FUNCTION public.get_department_manager(dept_id UUID)
RETURNS UUID AS $$
  SELECT id FROM employees 
  WHERE department_id = dept_id 
    AND is_department_manager = TRUE 
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function to get department employee count
CREATE OR REPLACE FUNCTION public.get_department_employee_count(dept_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM employees 
  WHERE department_id = dept_id 
    AND status = 'active';
$$ LANGUAGE sql STABLE;

-- Function to get department average tenure (in months)
CREATE OR REPLACE FUNCTION public.get_department_avg_tenure(dept_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(
    ROUND(AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, hire_date)) * 12 + 
              EXTRACT(MONTH FROM AGE(CURRENT_DATE, hire_date))))::INTEGER,
    0
  ) FROM employees 
  WHERE department_id = dept_id 
    AND status = 'active'
    AND hire_date IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- ====================================================================
-- TRIGGERS FOR EMPLOYEE MANAGEMENT
-- ====================================================================

-- Trigger for manager auto-reassignment
DROP TRIGGER IF EXISTS on_manager_change ON employees;
CREATE TRIGGER on_manager_change
  AFTER UPDATE ON employees
  FOR EACH ROW 
  WHEN (NEW.is_department_manager IS DISTINCT FROM OLD.is_department_manager)
  EXECUTE FUNCTION public.handle_manager_change();

-- Trigger for role history tracking
DROP TRIGGER IF EXISTS on_employee_change ON employees;
CREATE TRIGGER on_employee_change
  AFTER INSERT OR UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION public.track_role_change();

-- ====================================================================
-- INSERT DEFAULT DEPARTMENTS
-- ====================================================================

INSERT INTO departments (name, description) VALUES
  ('Developer', 'Software development and engineering'),
  ('Sales', 'Sales and business development'),
  ('Support', 'Customer support and success')
ON CONFLICT (name) DO NOTHING;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ====================================================================';
  RAISE NOTICE '✅ GlassBox AI Database Schema Created Successfully!';
  RAISE NOTICE '✅ ====================================================================';
  RAISE NOTICE '✅ Core Tables: user_profiles, decisions, bias_analysis, explanations, audit_logs';
  RAISE NOTICE '✅ Performance Tables: departments, employees, projects, tasks';
  RAISE NOTICE '✅ Rating Tables: manager_ratings, peer_ratings, kpis';
  RAISE NOTICE '✅ RLS: Enabled with policies for data security';
  RAISE NOTICE '✅ Functions: Analytics, trends, and helper functions created';
  RAISE NOTICE '✅ Triggers: Auto user profile creation and timestamps configured';
  RAISE NOTICE '✅ Default Data: 3 departments (Developer, Sales, Support) inserted';
  RAISE NOTICE '✅ ====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Deploy Edge Functions for AI logic';
  RAISE NOTICE '2. Create employees and projects via frontend';
  RAISE NOTICE '3. Start recording project ratings and KPIs';
  RAISE NOTICE '';
END $$;

