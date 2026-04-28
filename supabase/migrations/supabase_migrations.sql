-- ─────────────────────────────────────────────────────────────────────────────
-- SkillForge: New Features — Supabase SQL Migrations
-- Run these in Supabase SQL Editor (Settings → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. NOTIFICATIONS TABLE ────────────────────────────────────────────────────
-- Required by: useNotifications.ts, NotificationBell.tsx

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'reminder')),
  read        BOOLEAN DEFAULT false,
  link        TEXT,                           -- optional in-app route, e.g. '/goals'
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast unread queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read, created_at DESC);


-- ── 2. DAILY STUDY REMINDERS (via pg_cron + pg_net) ──────────────────────────
-- Optional: auto-insert a "reminder" notification every morning for users
-- who haven't logged a session today. Requires pg_cron extension.
--
-- Enable in Supabase: Dashboard → Database → Extensions → pg_cron

-- SELECT cron.schedule(
--   'daily-study-reminder',
--   '0 8 * * *',   -- 8 AM UTC
--   $$
--     INSERT INTO notifications (user_id, title, body, type, link)
--     SELECT
--       p.user_id,
--       'Time to study! 📚',
--       'You haven''t logged a session yet today. Keep your streak going!',
--       'reminder',
--       '/sessions'
--     FROM profiles p
--     WHERE NOT EXISTS (
--       SELECT 1 FROM learning_sessions ls
--       WHERE ls.user_id = p.user_id
--         AND ls.created_at::date = CURRENT_DATE
--     );
--   $$
-- );


-- ── 3. POMODORO SESSIONS VIEW (optional analytics helper) ────────────────────
-- Useful for the Analytics page — groups sessions by day including duration

CREATE OR REPLACE VIEW daily_study_summary AS
SELECT
  user_id,
  created_at::date                                         AS study_date,
  COUNT(*)                                                  AS session_count,
  SUM(duration_minutes)                                    AS total_minutes,
  ROUND(SUM(duration_minutes)::numeric / 60, 2)            AS total_hours
FROM learning_sessions
GROUP BY user_id, created_at::date
ORDER BY study_date DESC;

-- Grant access
GRANT SELECT ON daily_study_summary TO authenticated;


-- ── 4. STREAK CALCULATION FUNCTION ───────────────────────────────────────────
-- Server-side streak calculation (optional — client also computes this)

CREATE OR REPLACE FUNCTION get_streak(p_user_id UUID)
RETURNS TABLE (current_streak INT, longest_streak INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rec             RECORD;
  cur_streak      INT := 0;
  max_streak      INT := 0;
  temp_streak     INT := 0;
  prev_date       DATE := NULL;
BEGIN
  FOR rec IN
    SELECT DISTINCT created_at::date AS day
    FROM learning_sessions
    WHERE user_id = p_user_id
    ORDER BY day DESC
  LOOP
    IF prev_date IS NULL OR prev_date - rec.day = 1 THEN
      temp_streak := temp_streak + 1;
      IF prev_date IS NULL OR prev_date = CURRENT_DATE THEN
        cur_streak := temp_streak;
      END IF;
    ELSE
      max_streak := GREATEST(max_streak, temp_streak);
      temp_streak := 1;
      IF rec.day = CURRENT_DATE THEN
        cur_streak := 1;
      ELSIF prev_date = CURRENT_DATE THEN
        cur_streak := 0;
      END IF;
    END IF;
    max_streak := GREATEST(max_streak, temp_streak);
    prev_date := rec.day;
  END LOOP;

  current_streak := cur_streak;
  longest_streak := max_streak;
  RETURN NEXT;
END;
$$;

-- Usage: SELECT * FROM get_streak('user-uuid-here');


-- ── 5. AI COACH EDGE FUNCTION — action handler addition ──────────────────────
-- In your existing "ai-planner" Supabase Edge Function, add a case for "coach":
--
-- if (action === 'coach') {
--   const { systemContext, history, userMessage } = body;
--   const messages = [
--     ...history,
--     { role: 'user', content: userMessage }
--   ];
--   const completion = await openai.chat.completions.create({
--     model: 'gpt-4o-mini',
--     system: systemContext,
--     messages,
--     max_tokens: 500,
--   });
--   return new Response(JSON.stringify({
--     reply: completion.choices[0].message.content
--   }), { headers: { 'Content-Type': 'application/json' } });
-- }
