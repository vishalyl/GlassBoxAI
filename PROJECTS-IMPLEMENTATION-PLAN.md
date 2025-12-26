# Projects Feature - Detailed Implementation Plan

## Overview
The Projects feature will allow HR managers to create projects, assign employees to them, and track task completion with performance ratings. This feeds into the bias-free decision intelligence system.

---

## Database Schema (Already Exists ✅)

### Tables:
1. **`projects`**
   - id, name, description, department_id, start_date, end_date, status, created_by, created_at, updated_at

2. **`tasks`**
   - id, project_id, assigned_to (employee_id), title, description, priority, complexity, estimated_hours, actual_hours, status, completed_at, created_at, updated_at

3. **`manager_ratings`**
   - id, task_id, rated_by, volume_score, quality_score, speed_score, complexity_score, feedback, created_at

4. **`peer_ratings`**
   - id, task_id, rated_by, rating_score, feedback, created_at

5. **`kpis`**
   - id, employee_id, period_start, period_end, total_tasks, avg_volume, avg_quality, avg_speed, avg_complexity, on_time_completion_rate, created_at

---

## Frontend Architecture

### Route Structure:
```
/projects
  - Main projects list with filters
  - Create new project button
  
/projects/[id]
  - Project details
  - Tasks list for this project
  - Assigned employees
  - Project statistics
  
/projects/[id]/tasks/new
  - Create task form
  
/employees/[id]
  - Employee profile (already planned)
  - Shows all tasks assigned
  - Shows KPIs and ratings
```

---

## Phase 1: Projects List Page (`/projects`)

### Features:
1. **Project Cards Grid**
   - Project name, description
   - Status badge (Planning/Active/Completed/On Hold)
   - Department
   - Date range
   - Progress bar (% of tasks completed)
   - Team size (# of assigned employees)

2. **Filters & Search**
   - Search by project name
   - Filter by department
   - Filter by status
   - Filter by date range

3. **Create Project Modal**
   - Name (required)
   - Description
   - Department dropdown
   - Start date, End date
   - Status dropdown

### API Functions Needed:
```typescript
// Already exist in api.ts:
- getProjects(filters?)
- createProject(data)
- updateProject(id, data)
- deleteProject(id)
```

### UI Components:
- `ProjectCard` - Display single project
- `ProjectFilters` - Search and filter bar
- `CreateProjectModal` - Form to create project
- Status badges with colors

---

## Phase 2: Project Detail Page (`/projects/[id]`)

### Sections:

#### A. Project Header
- Project name (editable)
- Status dropdown (editable)
- Department
- Date range
- Edit/Delete buttons

#### B. Project Statistics
- Total tasks: 25
- Completed: 18 (72%)
- In Progress: 5
- Todo: 2
- Average task completion time: 3.5 days
- Team performance score: 8.2/10

#### C. Tasks List
Table with columns:
- Task title
- Assigned to (employee name + avatar)
- Priority (High/Medium/Low)
- Complexity (1-5 stars)
- Status (Todo/In Progress/Completed)
- Estimated hours vs Actual hours
- Actions (Edit, Rate, Delete)

**Features:**
- Sort by any column
- Filter by assignee, status, priority
- Click row → open task detail modal
- "+ Add Task" button

#### D. Team Members
List of employees assigned to this project:
- Employee name
- Role
- Tasks assigned count
- Tasks completed count
- Average rating received
- Click → go to employee profile

### API Functions Needed:
```typescript
- getProject(id)
- getProjectTasks(projectId, filters?)
- getProjectTeamMembers(projectId)
- getProjectStats(projectId)
```

---

## Phase 3: Task Management

### A. Create Task Modal
Fields:
- Title (required)
- Description
- Assigned to (employee dropdown - only from project's department)
- Priority (High/Medium/Low)
- Complexity (1-5)
- Estimated hours
- Status (default: Todo)

### B. Edit Task Modal
Same fields + Actual hours

### C. Task Detail Modal
Shows:
- All task info
- Status update buttons (Todo → In Progress → Complete)
- Manager rating section (if status = Completed)
  - Volume (1-10)
  - Quality (1-10)
  - Speed (1-10)
  - Complexity (1-10)
  - Feedback textarea
- Peer ratings list (if any)
- Activity timeline

### API Functions:
```typescript
- createTask(projectId, data)
- updateTask(taskId, data)
- deleteTask(taskId)
- getTask(taskId)
```

---

## Phase 4: Rating System

### Manager Rating Form
When task status → Completed, manager can rate:
- **Volume Score (1-10)**: How much work was accomplished
- **Quality Score (1-10)**: How well was it done
- **Speed Score (1-10)**: How quickly relative to estimate
- **Complexity Score (1-10)**: Difficulty of the task
- **Feedback**: Text comments

### Peer Rating
Other employees on same project can rate:
- **Rating (1-10)**: Collaboration & quality
- **Feedback**: Comments

### API Functions:
```typescript
- createManagerRating(taskId, ratingData)
- updateManagerRating(ratingId, ratingData)
- getPeerRatings(taskId)
- createPeerRating(taskId, ratingData)
```

---

## Phase 5: Employee Profile Integration

On `/employees/[id]` page, add tabs:

### Tasks Tab
- All tasks assigned (current + completed)
- Filterable by project, status, date
- Click → open task detail

### Performance Tab
Shows KPIs:
- **Current Period Performance**
  - Total tasks completed
  - Average ratings (Volume, Quality, Speed, Complexity)
  - On-time completion rate
  - Trend graphs

- **Historical Performance**
  - Performance over time (line chart)
  - Best performing areas
  - Areas for improvement

### API Functions:
```typescript
- getEmployeeTasks(employeeId, filters?)
- getEmployeeKPIs(employeeId, periodStart?, periodEnd?)
- calculateEmployeePerformance(employeeId)
```

---

## Phase 6: KPI Calculation (Background Job or Manual Trigger)

### Auto-calculate monthly/quarterly KPIs:
```sql
-- Function already exists: We need to create a cron job or manual button
INSERT INTO kpis (employee_id, period_start, period_end, ...)
SELECT 
  employee_id,
  date_trunc('month', CURRENT_DATE) as period_start,
  CURRENT_DATE as period_end,
  COUNT(*) as total_tasks,
  AVG(volume_score) as avg_volume,
  AVG(quality_score) as avg_quality,
  AVG(speed_score) as avg_speed,
  AVG(complexity_score) as avg_complexity,
  (COUNT(*) FILTER (WHERE actual_hours <= estimated_hours))::FLOAT / COUNT(*) as on_time_rate
FROM tasks t
JOIN manager_ratings mr ON mr.task_id = t.id
WHERE t.status = 'completed'
  AND t.completed_at >= date_trunc('month', CURRENT_DATE)
GROUP BY employee_id;
```

### UI:
- Admin button: "Calculate KPIs for All Employees"
- Shows loading, then success message

---

## Phase 7: Visualization & Analytics

### Project Dashboard (`/projects/analytics`)
Charts showing:
1. **Projects by Status** (pie chart)
2. **Task Completion Over Time** (line chart)
3. **Top Performers** (bar chart - employees with highest avg ratings)
4. **Department Performance** (comparison)
5. **Bottlenecks** (tasks overdue or in progress > 7 days)

### Libraries:
- `recharts` for charts (already lightweight, React-friendly)

---

## Implementation Order

### Week 1: Core Projects
1. ✅ Database schema (done)
2. Create `/projects` page with list
3. Project filters & search
4. Create/Edit/Delete project modals
5. Project cards with basic stats

### Week 2: Tasks
1. Create `/projects/[id]` page
2. Tasks table with filters
3. Create/Edit task modals
4. Task status updates
5. Assign employees to tasks

### Week 3: Ratings
1. Manager rating form on completed tasks
2. Peer rating system
3. Display ratings on task detail
4. Rating validation (only manager or peers can rate)

### Week 4: Employee Profiles & KPIs
1. Add tasks tab to `/employees/[id]`
2. Add performance tab with KPIs
3. KPI calculation function
4. Performance trend charts

### Week 5: Analytics & Polish
1. Create `/projects/analytics` dashboard
2. Add visualizations
3. Polish UI/UX
4. Testing & bug fixes
5. Mobile responsiveness

---

## Key Design Decisions

### 1. **Task Workflow**
Todo → In Progress → Completed
- Only assigned employee can update status
- Only manager can mark as "Completed"
- Rating unlocks when status = Completed

### 2. **Rating Rules**
- Manager can rate after completion
- Peers can rate while task is in progress or after
- Ratings are immutable once submitted
- Editable for 24 hours after submission

### 3. **Performance Metrics**
- Volume: Amount of work (subjective, 1-10)
- Quality: How well done (objective, based on rework needed)
- Speed: Actual vs estimated hours
- Complexity: Difficulty level (set by manager when creating task)

### 4. **Data Access**
- Employees see their own tasks & ratings
- Managers see all tasks in their department
- HR/Admin see everything
- RLS policies enforce this

---

## Estimated Effort
- Phase 1 (Projects List): ~4-6 hours
- Phase 2 (Project Detail): ~6-8 hours
- Phase 3 (Task Management): ~4-6 hours
- Phase 4 (Ratings): ~4-6 hours
- Phase 5 (Employee Profiles): ~6-8 hours
- Phase 6 (KPIs): ~3-4 hours
- Phase 7 (Analytics): ~6-8 hours

**Total: 33-46 hours** (4-6 days of focused work)

---

## Next Immediate Steps

**Want to start now?**
1. I'll create the `/projects` page with project list
2. Implement filters & search
3. Create project CRUD modals
4. Show you the working prototype

**Or wait and polish Organization first?**
- Fix remaining issues with manager display
- Add more features to Organization tab
- Then move to Projects

**Your choice!** 🚀
