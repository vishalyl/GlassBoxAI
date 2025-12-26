-- ====================================================================
-- FIX RATINGS CONSTRAINTS FOR BULK ENTRY
-- ====================================================================

-- We want to allow creating ratings at the PROJECT level (task_id IS NULL).
-- The previous constraint 'manager_ratings_task_unique' (task_id, rated_by_id)
-- allows duplicate (NULL, rated_by_id) rows, which leads to duplicate project ratings.

-- 1. Create a Unique Index for Project-Level Ratings
-- Ensures a manager can rate an employee only once per project (when task_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_ratings_project_level 
ON manager_ratings(project_id, employee_id, rated_by_id) 
WHERE task_id IS NULL;

-- 2. Create a Unique Index for Task-Level Ratings (already covered by constraint? check)
-- The 'manager_ratings_task_unique' (task_id, rated_by_id) constraint from upgrade_tasks.sql
-- might conflict if task_id is shared. Actually, task ratings should also be unique per employee?
-- Wait, if multiple employees are on a task, 'task_id, rated_by_id' is WRONG!
-- If I rate Task A, I rate *Specific Employee*.
-- So 'manager_ratings_task_unique' referring to (task_id, rated_by_id) implies ONE rating per task?
-- BUT a task has multiple assignees now.
-- So I must drop that constraint!

ALTER TABLE manager_ratings DROP CONSTRAINT IF EXISTS manager_ratings_task_unique;

-- Correct Constraint for Task Ratings: One rating per (Task, Employee, Manager)
CREATE UNIQUE INDEX IF NOT EXISTS idx_manager_ratings_task_level
ON manager_ratings(task_id, employee_id, rated_by_id)
WHERE task_id IS NOT NULL;
