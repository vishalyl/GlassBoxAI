DO $$
BEGIN
    -- Add explanation to audit_entries
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_entries' AND column_name='explanation') THEN
        ALTER TABLE audit_entries ADD COLUMN explanation TEXT;
    END IF;
END $$;

-- Relax RLS for Bonus Distribution tables
DROP POLICY IF EXISTS "Authenticated users can view bonus distributions" ON bonus_distributions;
DROP POLICY IF EXISTS "HR can manage bonus distributions" ON bonus_distributions;
DROP POLICY IF EXISTS "Enable read access for all users" ON bonus_distributions;
CREATE POLICY "Enable read access for all users" ON bonus_distributions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON bonus_distributions;
CREATE POLICY "Enable insert access for all users" ON bonus_distributions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON bonus_distributions;
CREATE POLICY "Enable delete access for all users" ON bonus_distributions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Employees can view own allocations" ON bonus_allocations;
DROP POLICY IF EXISTS "HR can manage allocations" ON bonus_allocations;
DROP POLICY IF EXISTS "Enable read access for all users" ON bonus_allocations;
CREATE POLICY "Enable read access for all users" ON bonus_allocations FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert access for all users" ON bonus_allocations;
CREATE POLICY "Enable insert access for all users" ON bonus_allocations FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable delete access for all users" ON bonus_allocations;
CREATE POLICY "Enable delete access for all users" ON bonus_allocations FOR DELETE USING (true);
