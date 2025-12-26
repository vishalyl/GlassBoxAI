-- ====================================================================
-- ENABLE MULTIPLE ASSIGNEES
-- ====================================================================

-- 1. Create junction table
CREATE TABLE IF NOT EXISTS task_assignments (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (task_id, employee_id)
);

-- 2. Migrate existing assignments from 'assigned_to_id' column
INSERT INTO task_assignments (task_id, employee_id)
SELECT id, assigned_to_id 
FROM tasks 
WHERE assigned_to_id IS NOT NULL;

-- 3. Update Indexes
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_employee ON task_assignments(employee_id);

-- Note: We are keeping 'assigned_to_id' column in 'tasks' table for now 
-- to prevent immediate breakage of existing queries, but it should be deprecated.
-- The API will now primarily write to 'task_assignments'.
