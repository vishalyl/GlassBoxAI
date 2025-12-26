-- Promotion Decisions Table
CREATE TABLE IF NOT EXISTS promotion_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    total_slots INTEGER NOT NULL,
    status TEXT DEFAULT 'draft',
    criteria_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotion Candidates Table
CREATE TABLE IF NOT EXISTS promotion_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID REFERENCES promotion_decisions(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    score NUMERIC NOT NULL,
    rank INTEGER NOT NULL,
    is_recommended BOOLEAN DEFAULT false,
    calculation_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE promotion_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_candidates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "Enable read access for all users" ON promotion_decisions;
DROP POLICY IF EXISTS "Enable insert access for all users" ON promotion_decisions;
DROP POLICY IF EXISTS "Enable update access for all users" ON promotion_decisions;

DROP POLICY IF EXISTS "Enable read access for all users" ON promotion_candidates;
DROP POLICY IF EXISTS "Enable insert access for all users" ON promotion_candidates;

-- Re-create policies
CREATE POLICY "Enable read access for all users" ON promotion_decisions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON promotion_decisions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON promotion_decisions FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON promotion_candidates FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON promotion_candidates FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotion_candidates_decision ON promotion_candidates(decision_id);
CREATE INDEX IF NOT EXISTS idx_promotion_candidates_employee ON promotion_candidates(employee_id);
