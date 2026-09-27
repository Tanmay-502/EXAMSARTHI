-- Migration 00010: Enforce one active session per candidate/mode

-- Retire legacy duplicate active sessions before adding unique indexes.
WITH ranked_exam_sessions AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY candidate_id, exam_id ORDER BY started_at DESC, id DESC) AS rn
  FROM exam_sessions
  WHERE status = 'in_progress' AND is_practice = false
)
UPDATE exam_sessions AS sessions
SET status = 'abandoned', completed_at = COALESCE(completed_at, NOW())
FROM ranked_exam_sessions AS ranked
WHERE sessions.id = ranked.id AND ranked.rn > 1;

WITH ranked_practice_sessions AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY candidate_id ORDER BY started_at DESC, id DESC) AS rn
  FROM exam_sessions
  WHERE status = 'in_progress' AND is_practice = true
)
UPDATE exam_sessions AS sessions
SET status = 'abandoned', completed_at = COALESCE(completed_at, NOW())
FROM ranked_practice_sessions AS ranked
WHERE sessions.id = ranked.id AND ranked.rn > 1;

ALTER TABLE exam_sessions
  ADD CONSTRAINT exam_session_mode_consistency
  CHECK ((is_practice = true AND exam_id IS NULL) OR (is_practice = false AND exam_id IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_one_active_exam_per_candidate
  ON exam_sessions(candidate_id, exam_id)
  WHERE status = 'in_progress' AND is_practice = false;

CREATE UNIQUE INDEX IF NOT EXISTS exam_sessions_one_active_practice_per_candidate
  ON exam_sessions(candidate_id)
  WHERE status = 'in_progress' AND is_practice = true;
