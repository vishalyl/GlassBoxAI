-- Audit Records Table
CREATE TABLE IF NOT EXISTS audit_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    department_id UUID REFERENCES departments(id),
    total_employees_audited INTEGER NOT NULL,
    agreement_score NUMERIC,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Entries Table
CREATE TABLE IF NOT EXISTS audit_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id UUID REFERENCES audit_records(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id),
    
    manager_decision_value NUMERIC,
    manager_decision_text TEXT,
    
    ai_recommendation_value NUMERIC,
    ai_recommendation_text TEXT,
    
    variance_score NUMERIC,
    is_flagged BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE audit_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts on re-run
DROP POLICY IF EXISTS "Enable read access for all users" ON audit_records;
DROP POLICY IF EXISTS "Enable insert access for all users" ON audit_records;

DROP POLICY IF EXISTS "Enable read access for all users" ON audit_entries;
DROP POLICY IF EXISTS "Enable insert access for all users" ON audit_entries;

-- Re-create policies
CREATE POLICY "Enable read access for all users" ON audit_records FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON audit_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON audit_entries FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON audit_entries FOR INSERT WITH CHECK (true);
