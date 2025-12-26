# 🚀 Edge Functions Deployment Guide

## ✅ Step 1 - Database Migration: COMPLETE!

Your Supabase database now has:
- ✅ All tables (decisions, bias_analysis, explanations, etc.)
- ✅ Row Level Security policies
- ✅ Database functions for analytics
- ✅ Triggers for auto user profiles

---

## 📋 Step 2 - Deploy Edge Functions

### Commands to Run (In Order):

```bash
# 1. Install Supabase CLI (if you don't have it)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project
supabase link --project-ref yxjsgfvqeiiltfheggnj

# 4. Deploy the Edge Functions (one by one)
supabase functions deploy analyze-bias
supabase functions deploy generate-explanation
supabase functions deploy analytics
```

### What Each Function Does:

1. **analyze-bias** - Runs statistical bias detection on decisions
2. **generate-explanation** - Calls Google Gemini AI for explanations
3. **analytics** - Provides dashboard metrics and trends

---

## 🔑 Step 3 - Set Gemini API Key

```bash
supabase secrets set GEMINI_API_KEY=your_actual_gemini_key_here
```

**Get your free Gemini API key:**
https://aistudio.google.com/app/apikey

---

## 🧪 Step 4 - Test the Application

```bash
cd frontend
npm install
npm run dev
```

Then open: http://localhost:3000

---

## 💡 Expected Output

When deploying functions, you should see:
```
✓ Deployed Function analyze-bias
✓ Deployed Function generate-explanation
✓ Deployed Function analytics
```

When setting secrets:
```
✓ Set secret GEMINI_API_KEY
```

---

## 🆘 Common Issues

### "supabase: command not found"
Run: `npm install -g supabase`

### "Failed to link project"
- Double-check project ref: `yxjsgfvqeiiltfheggnj`
- Make sure you're logged in: `supabase login`

### "Failed to deploy function"
- Make sure you're in project root directory
- Check that `supabase/functions/` directory exists
- Verify you're logged in and linked

---

## ✅ Progress Checklist

- [x] **Step 1:** Run SQL migration in Supabase ✅ DONE
- [ ] **Step 2:** Install Supabase CLI
- [ ] **Step 3:** Login to Supabase
- [ ] **Step 4:** Link project
- [ ] **Step 5:** Deploy analyze-bias function
- [ ] **Step 6:** Deploy generate-explanation function
- [ ] **Step 7:** Deploy analytics function
- [ ] **Step 8:** Set Gemini API key
- [ ] **Step 9:** Test the application

---

**Copy the commands above and run them in your terminal!** 🚀
