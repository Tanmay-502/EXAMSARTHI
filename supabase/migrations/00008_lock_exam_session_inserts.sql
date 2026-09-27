-- Remove client-side creation of exam sessions.
-- startExamSession/startPracticeSession already use the privileged server client.
-- Keeping this INSERT policy would allow a signed-in candidate to write an
-- arbitrary submitted session directly through the Supabase REST API.
DROP POLICY IF EXISTS "Candidates insert own sessions" ON exam_sessions;
