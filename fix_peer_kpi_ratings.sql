-- ====================================================================
-- FIX PEER AND KPI RATINGS CONSTRAINTS
-- ====================================================================

-- 1. Peer Ratings
-- Check if table exists
CREATE TABLE IF NOT EXISTS peer_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects,
  employee_id UUID REFERENCES employees,
  rated_by_id UUID REFERENCES employees, -- The rater
  volume_score DECIMAL(3,2),
  quality_score DECIMAL(3,2),
  speed_score DECIMAL(3,2),
  complexity_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLEANUP DUPLICATES (Keep latest)
DELETE FROM peer_ratings a USING (
      SELECT MIN(ctid) as ctid, project_id, employee_id, rated_by_id
      FROM peer_ratings 
      GROUP BY project_id, employee_id, rated_by_id HAVING COUNT(*) > 1
      ) b
      WHERE a.project_id = b.project_id 
      AND a.employee_id = b.employee_id 
      AND a.rated_by_id = b.rated_by_id 
      AND a.ctid <> b.ctid;

-- Drop old constraints if any
ALTER TABLE peer_ratings DROP CONSTRAINT IF EXISTS peer_ratings_project_id_employee_id_rated_by_id_key;

-- Add Unique Index
DROP INDEX IF EXISTS idx_peer_ratings_unique;
CREATE UNIQUE INDEX idx_peer_ratings_unique 
ON peer_ratings(project_id, employee_id, rated_by_id);


-- 2. KPIs
CREATE TABLE IF NOT EXISTS kpis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects,
  employee_id UUID REFERENCES employees,
  metric_category TEXT,
  metric_name TEXT,
  metric_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CLEANUP DUPLICATES (Keep latest)
DELETE FROM kpis a USING (
      SELECT MIN(ctid) as ctid, project_id, employee_id, metric_name
      FROM kpis 
      GROUP BY project_id, employee_id, metric_name HAVING COUNT(*) > 1
      ) b
      WHERE a.project_id = b.project_id 
      AND a.employee_id = b.employee_id 
      AND a.metric_name = b.metric_name 
      AND a.ctid <> b.ctid;

-- Drop old constraints
ALTER TABLE kpis DROP CONSTRAINT IF EXISTS kpis_project_id_employee_id_metric_name_key;

-- Add Unique Index
DROP INDEX IF EXISTS idx_kpis_unique;
CREATE UNIQUE INDEX idx_kpis_unique 
ON kpis(project_id, employee_id, metric_name);
