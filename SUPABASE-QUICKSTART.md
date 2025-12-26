# 🚀 GlassBox AI - Supabase Quick Start

## ✅ What You Need

1. **Supabase Account** - Free tier available at [supabase.com](https://supabase.com)
2. **Google Gemini API Key** - Free at [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **Node.js 18+** installed on your machine

---

## 📝 Step-by-Step Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in:
   - **Name**: glassbox-ai
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select closest to you
4. Click **"Create new project"**
5. Wait ~2 minutes for setup to complete

### Step 2: Set Up Database

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the file `supabase-migration.sql` in this project
4. **Copy the ENTIRE contents** of that file
5. **Paste** into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. You should see success messages in the output

✅ **Done!** Your database tables, RLS policies, and functions are now set up.

### Step 3: Get Your Supabase Credentials

1. In Supabase dashboard, go to **Settings** → **API** (left sidebar)
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 4: Configure Frontend Environment

1. In your code editor, navigate to: `frontend/`
2. Create a new file called `.env.local`
3. Add the following (replace with your actual values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key-here
```

4. Save the file

### Step 5: Deploy Edge Functions

**Install Supabase CLI:**

```bash
npm install -g supabase
```

**Login to Supabase:**

```bash
supabase login
```

**Link your project:**

```bash
cd c:\Users\visha\.gemini\antigravity\playground\emerald-meteor
supabase link --project-ref your-project-ref
```

(Get your project-ref from the Project URL: `https://YOUR-PROJECT-REF.supabase.co`)

**Deploy the Edge Functions:**

```bash
supabase functions deploy analyze-bias
supabase functions deploy generate-explanation
supabase functions deploy analytics
```

**Set your Gemini API key as a secret:**

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 6: Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

**Open**: [http://localhost:3000](http://localhost:3000)

---

## 🎉 You're Ready!

### Test the App

1. **Register**: Create a new account at `/register`
2. **Login**: Sign in with your credentials
3. **Create Decision**: Add a new HR decision
4. **Analyze**: Run bias detection
5. **Explain**: Generate AI explanation
6. **Dashboard**: View analytics

---

## 🔧 Troubleshooting

### "Missing Supabase environment variables"

**Problem**: Frontend can't find Supabase credentials  
**Solution**: Make sure `.env.local` exists in the `frontend/` folder with correct values

### "Failed to deploy Edge Functions"

**Problem**: Supabase CLI not linked  
**Solution**: Run `supabase link --project-ref YOUR_REF` first

### "Gemini API error"

**Problem**: API key not set  
**Solution**: Run `supabase secrets set GEMINI_API_KEY=your_key`

### Database connection issues

**Solution**: Re-run the migration SQL in Supabase SQL Editor

---

## 📱 Production Deployment

### Deploy Frontend to Vercel

```bash
cd frontend
npm install -g vercel
vercel --prod
```

**Add environment variables in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Verify Edge Functions

Check they're deployed at:
```
https://your-project.supabase.co/functions/v1/analyze-bias
https://your-project.supabase.co/functions/v1/generate-explanation  
https://your-project.supabase.co/functions/v1/analytics
```

---

## 🎯 What Changed from Old Version?

### ❌ Removed
- Entire `backend/` directory (FastAPI)
- PostgreSQL Docker container
- Custom auth system
- Backend API endpoints

### ✅ Added
- Supabase database
- Supabase Auth
- 3 Edge Functions (TypeScript)
- Direct database queries from frontend

### 💰 Benefits
- **No backend hosting costs**
- **Auto-scaling Edge Functions**
- **Built-in authentication**
- **Real-time capabilities** (future)
- **Simpler deployment**

---

## 📚 Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Supabase Docs**: https://supabase.com/docs
- **Edge Functions Guide**: https://supabase.com/docs/guides/functions
- **Google AI Studio**: https://aistudio.google.com

---

**Need help?** Check the implementation plan or review the code comments in the Edge Functions!
