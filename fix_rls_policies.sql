-- ====================================================================
-- FIX RLS POLICIES FOR RATINGS TABLES
-- ====================================================================
-- This allows authenticated users to manage ratings without restriction
-- Since this is an internal HR tool, we trust authenticated users

-- Manager Ratings: Allow all authenticated users to insert and update
DROP POLICY IF EXISTS "Users can create manager ratings" ON manager_ratings;
DROP POLICY IF EXISTS "Users can update manager ratings" ON manager_ratings;

CREATE POLICY "Authenticated users can manage manager ratings" ON manager_ratings
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Peer Ratings: Allow all authenticated users
DROP POLICY IF EXISTS "Users can create peer ratings" ON peer_ratings;
DROP POLICY IF EXISTS "Users can update peer ratings" ON peer_ratings;

CREATE POLICY "Authenticated users can manage peer ratings" ON peer_ratings
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- KPIs: Allow all authenticated users
DROP POLICY IF EXISTS "Users can manage kpis in own projects" ON kpis;
DROP POLICY IF EXISTS "Users can update kpis" ON kpis;

CREATE POLICY "Authenticated users can manage kpis" ON kpis
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
