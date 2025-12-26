-- ====================================================================
-- TEST: Verify Manager Auto-Reassignment Trigger
-- ====================================================================
-- Run this in Supabase SQL Editor to verify the trigger is working

-- 1. Check if trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_manager_change';

-- 2. Check current Sales department employees
SELECT 
    name, 
    role_title, 
    is_department_manager, 
    reports_to_id,
    (SELECT name FROM employees e2 WHERE e2.id = e1.reports_to_id) as reports_to_name
FROM employees e1
WHERE department_id = (SELECT id FROM departments WHERE name = 'Sales')
ORDER BY is_department_manager DESC, name;

-- ====================================================================
-- MANUAL FIX: If trigger doesn't exist, run these commands
-- ====================================================================

-- Recreate the trigger function
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_manager_change ON employees;
CREATE TRIGGER on_manager_change
  AFTER UPDATE ON employees
  FOR EACH ROW 
  WHEN (NEW.is_department_manager IS DISTINCT FROM OLD.is_department_manager)
  EXECUTE FUNCTION public.handle_manager_change();

-- ====================================================================
-- MANUAL ONE-TIME FIX for current data
-- ====================================================================
-- Run this ONCE to fix the existing Sales department data:

DO $$
DECLARE
  sales_dept_id UUID;
  new_manager_id UUID;
BEGIN
  -- Get Sales department ID
  SELECT id INTO sales_dept_id FROM departments WHERE name = 'Sales';
  
  -- Get the person you want as manager (replace 'asdads' with actual name)
  SELECT id INTO new_manager_id FROM employees 
  WHERE name = 'asdads' AND department_id = sales_dept_id;
  
  IF new_manager_id IS NOT NULL THEN
    -- First, demote all other managers in Sales
    UPDATE employees 
    SET is_department_manager = FALSE 
    WHERE department_id = sales_dept_id 
      AND is_department_manager = TRUE 
      AND id != new_manager_id;
    
    -- Make asdads the manager
    UPDATE employees 
    SET is_department_manager = TRUE 
    WHERE id = new_manager_id;
    
    -- Reassign everyone in Sales to report to asdads
    UPDATE employees
   SET reports_to_id = new_manager_id
    WHERE department_id = sales_dept_id
      AND id != new_manager_id;
  END IF;
END $$;

-- Verify the fix
SELECT 
    name, 
    role_title, 
    is_department_manager, 
    (SELECT name FROM employees e2 WHERE e2.id = e1.reports_to_id) as reports_to_name
FROM employees e1
WHERE department_id = (SELECT id FROM departments WHERE name = 'Sales')
ORDER BY is_department_manager DESC, name;
