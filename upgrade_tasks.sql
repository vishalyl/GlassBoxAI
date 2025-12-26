-- ====================================================================
-- UPGRADE SCHEMA: Advanced Task Features
-- ====================================================================

-- 1. Enhance Tasks Table
-- Add missing columns that are used in the frontend
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium'; -- 'High', 'Medium', 'Low'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS complexity INTEGER DEFAULT 3; -- 1-5 scale

-- Set default for weightage (1-10) to avoid NOT NULL errors
ALTER TABLE tasks ALTER COLUMN weightage SET DEFAULT 1;

-- Rename 'name' to 'title' to match frontend (and standard task terminology)
DO $$
BEGIN
  IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'name') THEN
    ALTER TABLE tasks RENAME COLUMN name TO title;
  END IF;
END $$;

-- 2. Update Status Constraint
-- Allow 'todo' status which is used in Kanban view
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (status IN ('todo', 'in_progress', 'completed'));

-- 3. Prepare for Phase 3 (Ratings)
-- Add task_id to manager_ratings for granularity
ALTER TABLE manager_ratings ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Drop usage of project-level unique constraint if we move to task-level
ALTER TABLE manager_ratings DROP CONSTRAINT IF EXISTS manager_ratings_project_id_employee_id_rated_by_id_key;

-- Add new unique constraint: Manager can rate a specific task only once
ALTER TABLE manager_ratings ADD CONSTRAINT manager_ratings_task_unique UNIQUE (task_id, rated_by_id);
