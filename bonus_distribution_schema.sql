-- ====================================================================
-- BONUS DISTRIBUTION SYSTEM
-- ====================================================================
-- Tables to support performance-based bonus calculation and distribution

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bonus Distributions (the bonus pool setup)
CREATE TABLE IF NOT EXISTS bonus_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                          -- "Q4 2024 Performance Bonus"
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  date_range_start DATE,                       -- Filter projects by date (optional)
  date_range_end DATE,
  eligible_departments UUID[],                 -- NULL = all departments
  eligible_employees UUID[],                   -- NULL = all from selected departments
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'calculated', 'approved', 'paid')),
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual employee bonus allocations
CREATE TABLE IF NOT EXISTS bonus_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  distribution_id UUID REFERENCES bonus_distributions(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  contribution_percentage DECIMAL(5,2) NOT NULL CHECK (contribution_percentage >= 0 AND contribution_percentage <= 100),
  bonus_amount DECIMAL(12,2) NOT NULL CHECK (bonus_amount >= 0),
  calculation_details JSONB DEFAULT '{}'::jsonb,  -- Stores breakdown for transparency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(distribution_id, employee_id)           -- One allocation per employee per distribution
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bonus_distributions_created_by ON bonus_distributions(created_by);
CREATE INDEX IF NOT EXISTS idx_bonus_distributions_status ON bonus_distributions(status);
CREATE INDEX IF NOT EXISTS idx_bonus_distributions_created_at ON bonus_distributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bonus_allocations_distribution ON bonus_allocations(distribution_id);
CREATE INDEX IF NOT EXISTS idx_bonus_allocations_employee ON bonus_allocations(employee_id);

-- RLS Policies
ALTER TABLE bonus_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_allocations ENABLE ROW LEVEL SECURITY;

-- Bonus Distributions: Authenticated users can view all, HR can manage
DROP POLICY IF EXISTS "Authenticated users can view bonus distributions" ON bonus_distributions;
CREATE POLICY "Authenticated users can view bonus distributions" ON bonus_distributions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "HR can manage bonus distributions" ON bonus_distributions;
CREATE POLICY "HR can manage bonus distributions" ON bonus_distributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('hr_manager', 'admin')
    )
  );

-- Bonus Allocations: Employees can see their own, HR can see all
DROP POLICY IF EXISTS "Employees can view own allocations" ON bonus_allocations;
CREATE POLICY "Employees can view own allocations" ON bonus_allocations
  FOR SELECT USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('hr_manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "HR can manage allocations" ON bonus_allocations;
CREATE POLICY "HR can manage allocations" ON bonus_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('hr_manager', 'admin')
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS on_bonus_distribution_updated ON bonus_distributions;
CREATE TRIGGER on_bonus_distribution_updated
  BEFORE UPDATE ON bonus_distributions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Bonus Distribution tables created successfully!';
  RAISE NOTICE '📋 Tables: bonus_distributions, bonus_allocations';
  RAISE NOTICE '🔒 RLS policies enabled';
END $$;
