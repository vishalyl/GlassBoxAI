# 🚀 GlassBox AI - Quick Start Guide

## Prerequisites
- Docker & Docker Compose installed
- Google AI Studio API Key ([Get one free here](https://aistudio.google.com/app/apikey))

---

## Start the Application in 3 Steps

### 1️⃣ Set Up Environment

```bash
# Copy the environment template
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```
GEMINI_API_KEY=your_actual_api_key_here
JWT_SECRET=change_this_to_a_long_random_string
```

### 2️⃣ Start All Services

```bash
# Build and start Docker containers
docker-compose up --build
```

Wait for the services to start (about 1-2 minutes first time).

### 3️⃣ Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs (Interactive!)

---

## First Time Use

### Create an Account

**Option 1: Via UI** (when auth UI is connected)
- Navigate to http://localhost:3000
- Click "Get Started" or "Register"

**Option 2: Via API (Current)**
1. Go to http://localhost:8000/docs
2. Find `POST /api/v1/auth/register`
3. Click "Try it out"
4. Enter:
```json
{
  "email": "admin@example.com",
  "password": "securepassword123",
  "full_name": "Admin User",
  "role": "hr_manager"
}
```

### Login and Get Token

1. In API docs, find `POST /api/v1/auth/login`
2. Click "Try it out"
3. Enter username (email) and password
4. Copy the `access_token` from response
5. Click "Authorize" button at top
6. Paste token as: `Bearer YOUR_TOKEN_HERE`

---

## Create Your First Decision

### Using API Docs Interface

1. Go to `POST /api/v1/decisions/create`
2. Click "Try it out"
3. Paste this sample data:

```json
{
  "decision_type": "promotion",
  "employee_data": {
    "name": "Jane Smith",
    "years_experience": 5,
    "performance_rating": 4.2,
    "current_level": "Senior Engineer",
    "tenure_years": 3,
    "role_level": 3
  },
  "comparable_cohort": [
    {
      "name": "John Doe",
      "years_experience": 5,
      "performance_rating": 4.3,
      "current_level": "Senior Engineer",
      "outcome": "promoted"
    },
    {
      "name": "Alice Johnson",
      "years_experience": 5,
      "performance_rating": 4.1,
      "current_level": "Senior Engineer",
      "outcome": "promoted"
    },
    {
      "name": "Bob Williams",
      "years_experience": 6,
      "performance_rating": 4.0,
      "current_level": "Senior Engineer",
      "outcome": "not promoted"
    }
  ]
}
```

4. Click "Execute"
5. Copy the `id` from the response (e.g., `"id": "abc-123-def"`)

### Run Bias Analysis

1. Go to `POST /api/v1/decisions/{decision_id}/analyze`
2. Paste your decision ID
3. Click "Execute"
4. Review the bias analysis results:
   - Risk score (0-1)
   - Risk level (low/moderate/high)
   - Detected patterns
   - Fairness metrics

### Generate AI Explanation

1. Go to `POST /api/v1/decisions/{decision_id}/explain`
2. Paste your decision ID
3. Click "Execute"
4. Read the Gemini-generated explanation:
   - Plain-language justification
   - Key decision factors
   - Alternative perspectives

### Finalize Decision

1. After reviewing, go to `PUT /api/v1/decisions/{decision_id}/finalize`
2. Paste your decision ID
3. Click "Execute"
4. Decision is now finalized with complete audit trail

---

## View Dashboard & Analytics

### Dashboard Metrics
- `GET /api/v1/analytics/dashboard` - Overall stats

### Bias Trends
- `GET /api/v1/analytics/bias-trends?days=30` - Trends over time

### Fairness Metrics
- `GET /api/v1/analytics/fairness-metrics` - Organizational metrics

### Export Audit Logs
- `POST /api/v1/analytics/export-audit` - Download complete audit trail

---

## Sample CSV Upload Data

Create a file `sample_employees.csv`:

```csv
name,years_experience,performance_rating,current_level,outcome
Jane Smith,5,4.2,Senior,true
John Doe,5,4.3,Senior,true
Alice Johnson,5,4.1,Senior,false
Bob Williams,6,4.0,Senior,false
```

Use `POST /api/v1/decisions/upload` to upload this file.

---

## Troubleshooting

### Services won't start
```bash
# Stop all containers
docker-compose down

# Remove volumes and restart
docker-compose down -v
docker-compose up --build
```

### Can't access frontend
- Check if running: `docker ps`
- Should see 3 containers: `glassbox_frontend`, `glassbox_backend`, `glassbox_db`
- Check logs: `docker-compose logs frontend`

### Database connection error
```bash
# Restart just the database
docker-compose restart db

# Check if database is ready
docker-compose logs db | grep "ready to accept"
```

### Gemini API errors
- Verify your API key is correct in `.env`
- Check if you have API quota remaining
- System has fallback mode if Gemini unavailable

---

## Development Mode

### Run Backend Locally

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env in backend folder
export DATABASE_URL="postgresql://glassbox:password@localhost:5432/glassbox"
export GEMINI_API_KEY="your_key"
export JWT_SECRET="your_secret"

# Run
uvicorn app.main:app --reload
```

### Run Frontend Locally

```bash
cd frontend
npm install

# Create .env.local (or set environment variable)
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

---

## What's Next?

### Immediate Enhancements
1. **Connect frontend auth forms** to backend APIs
2. **Build decision workflow UI** for creating decisions via UI
3. **Add charts** with Chart.js for visualizations
4. **Test end-to-end flows**

### For Production
1. **Add comprehensive tests** (pytest for backend, Jest for frontend)
2. **Security hardening** (rate limiting, input sanitization)
3. **Performance optimization** (caching, query optimization)
4. **Deploy to cloud** (GCP, AWS, Azure)
5. **Set up CI/CD** pipeline

---

## Key Commands Reference

```bash
# Start everything
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild after code changes
docker-compose up --build

# Access database
docker exec -it glassbox_db psql -U glassbox -d glassbox
```

---

## Support

**API Documentation**: http://localhost:8000/docs  
**Project README**: [README.md](file:///c:/Users/visha/.gemini/antigravity/playground/emerald-meteor/README.md)  
**Full Walkthrough**: Check the walkthrough artifact

---

**You're all set! 🎉**

Start by creating a decision via the API docs, then explore the analytics endpoints to see the power of transparent, ethical AI-driven HR decisions.
