-- Drop insecure UPDATE policy on exam_sessions
DROP POLICY IF EXISTS "Candidates update own sessions" ON exam_sessions;

-- Drop ALL policy on answers that allows client modification (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Candidates insert/update own answers" ON answers;

