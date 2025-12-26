# GlassBox AI - Ethical HR Decision Intelligence Platform

GlassBox AI is an advanced algorithmic decision-support system designed to eliminate bias from critical HR processes. By leveraging multi-dimensional data analysis, it provides transparent, explainable, and fair recommendations for Compensation (Bonuses) and Career Progression (Promotions).

![GlassBox AI Dashboard](/frontend/public/dashboard-preview.png)

## 🚀 Key Features & Complexity

### 1. 💰 Intelligent Bonus Distribution Engine
Unlike simple "flat percentage" models, GlassBox uses a sophisticated weighted algorithm to calculate fair bonus allocations:
- **Multi-Source Logic**: Aggregates Manager Ratings (40%), Peer Reviews (30%), and Objective KPIs (30%).
- **Project Complexity Weighting**: adjusts scores based on the difficulty and impact of projects.
- **Task-Level Granularity**: Analyzes individual task completion and "Task Weight" to determine contribution.
- **Normalization**: Automatically normalizes scores across departments to prevent "grade inflation" from lenient managers.

### 2. 📈 Promotion Readiness & 9-Box Grid
A fully automated career progression engine:
- **Eligibility Gates**: Enforces strict tenure and performance thresholds before a candidate is even considered.
- **9-Box Grid Auto-Placement**: Plots employees based on Performance vs. Potential using historical data.
- **Bias Detection**: Flags "High Performance / Low Potential" anomalies that often indicate bias against critical contributors.
- **AI Readiness Score**: Calculates a 0-100% promotion readiness score based on role changes, recent ratings, and peer feedback.

### 3. 🛡️ Algorithmic Audit & Variance Detection
The "GlassBox" feature ensures human accountability:
- **Variance Analysis**: Instantly compares Manager Decisions vs. AI Recommendations.
- **Significant Deviation Flagging**: Automatically flags decisions that deviate >20% from the model.
- **Explanation Requirement**: Forces managers to provide written justifications for flagged decisions.
- **Audit Trails**: Immutable logs of all decisions, overrides, and justifications for compliance.

### 4. 🏢 Organization Intelligence
- **Dynamic Org Chart**: Graph-based data structure to handle complex reporting lines.
- **Auto-Reassignment**: Triggers that automatically reassign reports when a manager is promoted or terminated.
- **Role History Tracking**: SCD (Slowly Changing Dimensions) approach to tracking role and salary history over time.

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS (Glassmorphism Design System)
- **Database**: PostgreSQL (Supabase) with strict Row Level Security (RLS) policies.
- **Backend Logic**: 
    - Supabase Edge Functions for heavy calculations.
    - Database Triggers for data integrity constraints.
    - Complex SQL Views for real-time analytics.
- **Security**: 
    - Role-Based Access Control (RBAC).
    - Policy-driven data isolation (Managers see only their team, HR sees all).

## 🔒 Security & Compliance
This project enforces **Privacy by Design**:
- **Row Level Security (RLS)**: Database policies ensure no API endpoint can ever leak unauthorized data, even if the frontend code is compromised.
- **Audit Logging**: Every sensitive write operation is logged into a separate, tamper-evident audit table.

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- Supabase CLI

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/glassbox-ai.git

# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Database Setup
Schema migrations and RLS policies are managed via SQL scripts in the `/supabase` folder. Run `supabase db reset` to apply all migrations.

---
*Built for the Future of Work.*
